# Cron 价格监控集成模式

> Hermes cron + amazon-scraper + 飞书多维表格 + Discord 推送

## 架构

```
Hermes Cron (每6小时)
  └─ no_agent=True, deliver=discord
  └─ script: pickleball_price_monitor.py
      ├─ Docker amazon-scraper 抓取ASIN价格
      ├─ SQLite 存储历史价格
      ├─ 飞书多维表格写入每次检查记录 (lark-cli base +record-batch-create)
      └─ 价格变化时 → stdout → Discord推送
          无变化时 → 静默 (empty stdout, 不推送)
```

## 创建飞书多维表格

```bash
lark-cli base +base-create --name "监控表名" --table-name "价格记录" \
  --fields '[
    {"name":"ASIN","type":"text"},
    {"name":"商品标题","type":"text"},
    {"name":"当前价格","type":"number"},
    {"name":"上次价格","type":"number"},
    {"name":"价格变化","type":"number"},
    {"name":"变化幅度","type":"text"},
    {"name":"检查时间","type":"datetime"},
    {"name":"状态","type":"text"}
  ]' --as user
```

返回 `base_token` 和 `table.id`，填入脚本的 `BASE_TOKEN` 和 `TABLE_ID`。

## 飞书写入格式 (lark-cli base +record-batch-create)

`--json` 必须是 `{"fields":[...],"rows":[[...]]}` 格式，不是对象数组：

```python
batch_json = json.dumps({
    "fields": ["ASIN", "商品标题", "当前价格", "上次价格", "价格变化", "变化幅度", "检查时间", "状态"],
    "rows": [
        ["B0F6XSV7XB", "商品标题", 42.99, 45.99, -3.00, "↓ -6.5%", 1720000000000, "降价"],
        # ...
    ]
}, ensure_ascii=False)
```

- `检查时间` datetime 字段需**毫秒时间戳**（秒级 × 1000）
- `ensure_ascii=False` 保留中文
- 单批最多 200 行

## 创建 Cron 任务

```bash
hermes cron create "every 6h" \
  --name "Pickleball价格监控" \
  --script pickleball_price_monitor.py \
  --no-agent \
  --deliver discord
```

或通过 cronjob 工具：
```
cronjob(action="create", schedule="every 6h", deliver="discord", 
        no_agent=True, script="pickleball_price_monitor.py", name="监控名")
```

## ⚠️ Hermes Cron 时区陷阱

**Hermes cron 用 UTC 时间，不是北京时间！**

| 用户说 | 错误配置 | 正确配置 (UTC) | 实际北京时间 |
|---|---|---|---|
| "每天9点" | `0 9 * * *` | `0 1 * * *` | 09:00 |
| "每天凌晨3点" | `0 3 * * *` | `0 19 * * *` (前一天) | 03:00 |
| "每天20:30" | `30 20 * * *` | `0 12 * * *` | 20:30 |
| "每6小时" | `every 6h` | `every 6h` | 每6小时（不受时区影响） |

公式：**UTC = 北京时间 - 8小时**

duration 格式（`every 6h`, `30m`）不受时区影响，只有 cron 表达式（`0 9 * * *`）才需要换算。

## no_agent 模式行为

- `no_agent=True`：纯脚本执行，零 LLM token 消耗
- 脚本 stdout 非空 → 推送到 Discord
- 脚本 stdout 为空 → **静默**，不推送（watchdog 模式）
- 脚本 stderr → 日志，不推送
- Hermes 有 3 分钟硬中断保护

## 修改监控 ASIN 列表

编辑脚本顶部的 `ASINS` 列表：
```python
ASINS = ["B0F6XSV7XB", "B0FTQWG86Q", "B0G6CTNVQT"]
```

修改后无需重启 cron，下次执行自动生效（脚本每次运行时读取）。

## 依赖

- `amazon-scraper` Docker 镜像（已构建）
- `lark-cli` 已安装并认证（`lark-cli auth login`）
- Python 3.11+（sqlite3 内置）
