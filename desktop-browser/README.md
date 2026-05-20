# 四分屏隔离浏览器

这是一个独立 Electron 桌面项目，和现有的一问三知网页/NAS 后端分开。

## 功能

- 四个独立分屏
- 每个分屏有自己的地址栏
- 每个分屏使用独立持久分区：
  - `persist:screen-1`
  - `persist:screen-2`
  - `persist:screen-3`
  - `persist:screen-4`
- 不同分屏之间 Cookie、Session、LocalStorage 隔离
- 可以在同一个网站尝试登录不同账号

## 运行

```bash
npm install
npm start
```

## 注意

部分网站会限制嵌入式浏览器或 Electron 环境登录，例如 Google/Gmail 可能拒绝在 webview 内登录。这不是分区隔离失效，而是网站自己的安全策略。
