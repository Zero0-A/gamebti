# 暂缓接入的云统计

按用户选择，此次只发布工作簿定义的 42 种玩家倾向、题库和人物图。原先未提交的 `dist/cloud.js`、`dist/cloud.css` 原样移至此目录，暂不被网站加载，也不向旧 16 型云表登记新版结果。

后续接入时需要核对：

- `type_code` 接受 G001–G042，旧 16 型历史单独区分。
- 一次测试允许出现多个主倾向；多条倾向记录不能直接当作多位玩家。
- 聚合统计的分母、去重和试测版本需一并约定。
- 附加标签与主类型分开，默认不上传答题明细。

原入口：

```html
<link rel="stylesheet" href="cloud.css">
<script src="https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js" defer></script>
<script src="cloud.js" defer></script>
```

原公开配置保留在 `cloud.js`；未变更云端资源或数据库结构。
