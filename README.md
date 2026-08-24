# 聊天记录导出TXT - SillyTavern 插件

一键将 SillyTavern 聊天记录导出为 TXT 文本文件，每条消息自动带上时间戳。
支持日期筛选、角色名称自定义。

## 导出格式

```
2026-08-21 18:48
用户名：（吃完饭）我要离开了。

2026-08-21 18:48
角色名：（把空餐盒丢进垃圾桶）慢走。
```

## 安装方法

将 `chat-export-txt` 文件夹复制到 SillyTavern 的扩展目录：
- **所有用户可用**：`SillyTavern/public/scripts/extensions/third-party/chat-export-txt/`
- **仅当前用户**：`SillyTavern/data/<你的用户名>/extensions/chat-export-txt/`

或者在线安装：
```
https://github.com/passers-by149/Chat-Export-TXT
```

刷新 SillyTavern 页面即可。

## 使用方法

1. 打开 SillyTavern 的扩展设置面板，找到 **聊天记录导出TXT**
2. 配置导出参数
3. 点击 **导出为 TXT** 按钮，文件将下载到浏览器默认下载目录

## 功能说明

- **角色名称**：AI 角色显示的名字（留空使用角色原名）
- **跳过系统消息**：不导出系统提示
- **消息间留空行**：每条消息之间空一行
- **日期筛选**：全部 / 最近N天 / 自定义范围
- **Markdown 清理**：自动去除 `**` `*` `#` `~~` 等格式符号

## 更新日志

### v1.9.0
- 移除用户名称自定义设置，直接使用系统默认用户名
- 移除自定义文件名设置，文件自动以角色名命名
- 移除路径相关代码，简化安装流程

### v1.8.0
- 浏览器下载，简洁设置面板

### v1.7.1
- 改用 jQuery $.ajax 发送请求，兼容 SillyTavern 的 CSRF 和认证机制

### v1.7.0
- 初始版本
