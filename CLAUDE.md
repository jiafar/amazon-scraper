# Amazon Scraper

## 工具说明

本项目提供 Amazon 商品数据爬取脚本，基于 Playwright 实现反爬机制。

## 前置依赖

```bash
npm install playwright
npx playwright install chromium
```

## 使用方法

当用户要求爬取 Amazon 商品数据时，执行：

```bash
node scripts/amazon-scrape.js "<搜索关键词>" --pages <页数> [--output <输出文件>] [--delay <延迟ms>]
```

### 参数

- `<关键词>`（必填）— 搜索词，如 "over ear headphones"、"mechanical keyboard"
- `--pages <N>` — 爬取页数（默认5，每页约24个商品）
- `--output <路径>` — 保存 JSON 到文件（不指定则输出到 stdout）
- `--delay <ms>` — 页面间基础延迟（默认3000，被封时调高到5000+）

### 示例

```bash
# 爬3页耳机数据
node scripts/amazon-scrape.js "over ear headphones" --pages 3

# 爬10页键盘数据并保存
node scripts/amazon-scrape.js "mechanical keyboard" --pages 10 --output keyboards.json
```

## 输出格式

JSON 数组，每个商品包含：title, price, rating, reviews, asin, link, image, page

## 关键注意事项

1. **必须用搜索页（/s/）**— 分类页（/b/）不支持分页
2. **必须点击 Next 按钮翻页** — 直接改 URL 的 page 参数会触发 Amazon 反爬（返回狗狗错误页）
3. **需要滚动页面** — Amazon 懒加载商品卡片
4. **随机延迟** — 固定间隔容易被检测
5. 遇到 CAPTCHA 时无法自动处理，需降低频率或使用代理
