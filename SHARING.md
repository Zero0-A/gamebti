# 人格卡分享

公开地址在 `dist/share.js` 的 `publicURL` 配置：
`https://gamebti.app.workbuddy.host/?sharecode=UVPWTOVNVN`。

`sharecode` 保留 WorkBuddy 原公开链接的访问参数；`#meet=G023` 是本站的人格领取编号。42 种人格各用自己的 G 编号，不传答题记录。扫码进入后展示对应卡，用户点收藏，已有卡不会重复计数，也不改变本人测试结果。

二维码在浏览器本地生成，无外部二维码服务。显示于结果卡、收卡弹窗和图鉴展开详情；分享按钮生成带二维码的 1800×2520 图片，支持保存与系统图片分享，另保留复制链接。

Toast 放进当前最上层 dialog，避免原生模态 top layer 遮挡；关闭后回到 body。

验证：42 个二维码均使用独立 jsQR 解码器还原出正确 WorkBuddy 地址；实际导出的卡图及缩小为 900×1260 的卡图均解码成功。实测 WorkBuddy 链接能直接打开探险者领取弹窗。重复领取仍为 1/42，复制提示在卡图弹窗内且位于手机视口中。原有 npm 检查通过。

WorkBuddy 需要发布包含 share.js、share.css、vendor/qrcode.js 的完整 dist 目录，不能只更新 app.js。如更换公开地址或 sharecode，需更新 publicURL 后重新发布。
