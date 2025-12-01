# Mika 在线编译器服务器

基于 NestJS 和 WebSocket 的在线编辑器协同编辑服务后端。

## 项目概述

本项目是一个实时协同编辑服务器，支持多用户在线协作编程。通过 WebSocket 实现实时通信，提供协助请求、内容同步、消息聊天等核心功能。

## 主要业务功能

### 1. 用户连接管理
- **自动用户注册**：客户端连接时自动创建用户并分配唯一 UUID
- **连接状态跟踪**：实时跟踪所有在线用户的连接状态
- **断开处理**：用户断开连接时自动清理资源，处理协助请求状态

### 2. 协助请求系统
- **创建协助请求**：用户可以创建协助请求，等待其他用户加入协助
- **加入协助**：其他用户可以查看并加入协助请求，实现一对一协助
- **协助列表管理**：实时广播协助列表，支持显示/隐藏协助请求
- **结束协助**：请求者或协助者可以结束协助会话

### 3. 内容传输服务
- **大文件分片传输**：支持将大内容自动分割为多个分片（每片 10000 字符）
- **多格式支持**：支持字符串、JSON 对象、数组等多种数据格式
- **分片重组**：客户端接收分片后自动重组为完整内容
- **文件切换**：支持在协作过程中切换编辑的文件

### 4. 实时消息聊天
- **点对点消息**：支持用户之间的实时消息通信
- **消息历史**：保存消息记录，支持查询历史消息
- **消息确认**：发送方和接收方都会收到消息确认

### 5. 协同编辑
- **内容同步**：协助者可以实时同步代码内容给请求者
- **状态同步**：实时同步用户状态和协助状态
- **多文件支持**：支持在多个文件之间切换和同步

### 6. 文件下载服务
- **文件生成**：接收 JS、CSS、HTML 内容并生成可下载文件
- **下载链接**：自动生成唯一的下载链接
- **文件管理**：支持文件信息查询和删除
- **临时存储**：文件存储在服务器临时目录，支持自动清理

## HTTP API 文档

### 文件下载接口

#### 1. 创建文件并获取下载链接

**接口地址**：`POST /api/files`

**请求头**：
```
Content-Type: application/json
```

**请求体**：

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| content | string | - | 是 | 文件内容（JS、CSS 或 HTML 代码） |
| type | string | - | 是 | 文件类型，可选值：`js`、`css`、`html` |
| filename | string | - | 否 | 自定义文件名（不含扩展名），如果不提供则自动生成 |

**请求示例**：
```json
{
  "content": "console.log('Hello World');",
  "type": "js",
  "filename": "app"
}
```

**响应示例**：
```json
{
  "success": true,
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "downloadUrl": "/api/files/550e8400-e29b-41d4-a716-446655440000/download",
  "filename": "app.js",
  "message": "文件创建成功"
}
```

**响应字段说明**：

| 属性 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| fileId | string | 文件唯一标识符 |
| downloadUrl | string | 文件下载链接（相对路径） |
| filename | string | 文件名（含扩展名） |
| message | string | 操作消息 |

**错误响应**：
- `400 Bad Request`：内容为空、文件类型为空或不支持的文件类型
- `500 Internal Server Error`：文件创建失败

---

#### 2. 下载文件

**接口地址**：`GET /api/files/:fileId/download`

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fileId | string | 是 | 文件唯一标识符 |

**请求示例**：
```
GET /api/files/550e8400-e29b-41d4-a716-446655440000/download
```

**响应**：
- 返回文件内容，自动设置正确的 `Content-Type` 和 `Content-Disposition` 响应头
- 浏览器会自动下载文件

**Content-Type 映射**：
- `js` → `application/javascript`
- `css` → `text/css`
- `html` → `text/html`

**错误响应**：
- `404 Not Found`：文件不存在或文件内容不存在

---

#### 3. 获取文件信息

**接口地址**：`GET /api/files/:fileId/info`

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fileId | string | 是 | 文件唯一标识符 |

**请求示例**：
```
GET /api/files/550e8400-e29b-41d4-a716-446655440000/info
```

**响应示例**：
```json
{
  "success": true,
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "app.js",
  "contentType": "application/javascript",
  "downloadUrl": "/api/files/550e8400-e29b-41d4-a716-446655440000/download",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**错误响应**：
- `404 Not Found`：文件不存在

---

#### 4. 删除文件

**接口地址**：`DELETE /api/files/:fileId`

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fileId | string | 是 | 文件唯一标识符 |

**请求示例**：
```
DELETE /api/files/550e8400-e29b-41d4-a716-446655440000
```

**响应示例**：
```json
{
  "success": true,
  "message": "文件已删除"
}
```

**错误响应**：
- `404 Not Found`：文件不存在或已删除

---

## WebSocket 事件文档

### 客户端发送事件

#### 1. request-assistance（请求协助）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "request-assistance" |
| data | object | - | 是 | 请求数据对象 |
| data.templateId | string | - | 否 | 模板ID，如果不提供则使用用户当前模板ID |
| data.templateContent | string | "" | 否 | 模板内容，如果不提供则使用空字符串 |

**响应事件**：`assistance-requested`

---

#### 2. join-assistance（加入协助）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "join-assistance" |
| data | object | - | 是 | 请求数据对象 |
| data.requesterUuid | string | - | 是 | 请求协助者的用户UUID |

**响应事件**：`assistance-joined`（协助者）、`helper-joined`（请求者）

---

#### 3. send-template-content（发送模板内容）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "send-template-content" |
| data | object | - | 是 | 请求数据对象 |
| data.content | string \| object \| array | - | 是 | 要发送的内容，支持字符串、JSON对象或数组 |
| data.toUuid | string | - | 是 | 接收者的用户UUID |
| data.path | string | - | 是 | 文件路径 |
| data.templateId | string | - | 是 | 模板ID |

**响应事件**：`template-content-chunk`（接收者，可能多次，每个分片一次）

---

#### 4. switch-content-file（切换文件）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "switch-content-file" |
| data | object | - | 是 | 请求数据对象 |
| data.switchFile | string | - | 是 | 要切换到的文件路径 |
| data.toUuid | string | - | 是 | 接收者的用户UUID |
| data.templateId | string | - | 是 | 模板ID |

**响应事件**：`get-switch-file`（接收者）

---

#### 5. send-message（发送消息）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "send-message" |
| data | object | - | 是 | 请求数据对象 |
| data.toUuid | string | - | 是 | 接收者的用户UUID |
| data.content | string | - | 是 | 消息内容 |
| data.templateId | string | - | 是 | 模板ID |

**响应事件**：`message-sent`（发送者）、`message-received`（接收者）

---

#### 6. end-assistance（结束协助）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "end-assistance" |
| data | object | - | 是 | 请求数据对象 |
| data.requesterUuid | string | - | 是 | 请求协助者的用户UUID |

**响应事件**：`assistance-ended`

---

#### 7. get-assistance-list（获取协助列表）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "get-assistance-list" |
| data | object | {} | 否 | 请求数据对象，可为空 |

**响应事件**：`assistance-list`

---

### 服务端发送事件

#### 1. user-connected（用户连接成功）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "user-connected" |
| data | object | - | 是 | 用户信息对象 |
| data.uuid | string | - | 是 | 用户唯一标识符 |
| data.templateId | string | "" | 是 | 用户当前模板ID |
| data.isRequestingHelp | boolean | false | 是 | 是否正在请求协助 |

**触发时机**：客户端连接成功时自动发送

---

#### 2. assistance-requested（协助请求已创建）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "assistance-requested" |
| data | object | - | 是 | 响应数据对象 |
| data.success | boolean | true | 是 | 请求是否成功 |

**触发时机**：客户端发送 `request-assistance` 事件后

---

#### 3. assistance-joined（成功加入协助）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "assistance-joined" |
| data | object | - | 是 | 响应数据对象 |
| data.requesterUuid | string | - | 是 | 请求协助者的用户UUID |
| data.templateId | string | - | 是 | 模板ID |

**触发时机**：协助者成功加入协助请求后发送给协助者

---

#### 4. helper-joined（协助者已加入）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "helper-joined" |
| data | object | - | 是 | 响应数据对象 |
| data.helperUuid | string | - | 是 | 协助者的用户UUID |
| data.templateId | string | - | 是 | 模板ID |

**触发时机**：协助者加入协助请求后发送给请求者

---

#### 5. helper-leave（协助者离开）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "helper-leave" |
| data | object | - | 是 | 响应数据对象 |
| data.success | boolean | true | 是 | 操作是否成功 |

**触发时机**：协助者断开连接时发送给请求者

---

#### 6. template-content-chunk（模板内容分片）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "template-content-chunk" |
| data | object | - | 是 | 分片数据对象 |
| data.chunkIndex | number | - | 是 | 当前分片索引（从0开始） |
| data.totalChunks | number | - | 是 | 总分片数量 |
| data.content | string | - | 是 | 分片内容 |
| data.templateId | string | - | 是 | 模板ID |
| data.fromUuid | string | - | 是 | 发送者的用户UUID |
| data.path | string | - | 是 | 文件路径 |

**触发时机**：接收到 `send-template-content` 事件后，每个分片发送一次

**注意**：大内容会被自动分割为多个分片（每片最多10000字符），客户端需要接收所有分片后重组

---

#### 7. get-switch-file（文件切换通知）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "get-switch-file" |
| data | object | - | 是 | 文件切换数据对象 |
| data.path | string | - | 是 | 要切换到的文件路径 |
| data.templateId | string | - | 是 | 模板ID |
| data.fromUuid | string | - | 是 | 发送者的用户UUID |
| data.toUuid | string | - | 是 | 接收者的用户UUID |

**触发时机**：接收到 `switch-content-file` 事件后

---

#### 8. message-received（收到消息）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "message-received" |
| data | object | - | 是 | 消息数据对象 |
| data.fromUuid | string | - | 是 | 发送者的用户UUID |
| data.content | string | - | 是 | 消息内容 |
| data.timestamp | string | - | 是 | 消息时间戳（ISO格式） |
| data.templateId | string | - | 是 | 模板ID |

**触发时机**：接收到 `send-message` 事件后发送给接收者

---

#### 9. message-sent（消息已发送）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "message-sent" |
| data | object | - | 是 | 消息数据对象 |
| data.toUuid | string | - | 是 | 接收者的用户UUID |
| data.content | string | - | 是 | 消息内容 |
| data.timestamp | string | - | 是 | 消息时间戳（ISO格式） |

**触发时机**：接收到 `send-message` 事件后发送给发送者作为确认

---

#### 10. assistance-ended（协助已结束）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "assistance-ended" |
| data | object | - | 是 | 响应数据对象 |
| data.success | boolean | true | 是 | 操作是否成功 |

**触发时机**：接收到 `end-assistance` 事件后

---

#### 11. assistance-list（协助列表）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "assistance-list" |
| data | array | - | 是 | 协助请求列表数组 |
| data[].requesterUuid | string | - | 是 | 请求协助者的用户UUID |
| data[].templateId | string | - | 是 | 模板ID |
| data[].templateContent | string | - | 是 | 模板内容 |
| data[].show | boolean | true | 是 | 是否在列表中显示 |

**触发时机**：接收到 `get-assistance-list` 事件后

---

#### 12. assistance-list-updated（协助列表更新）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "assistance-list-updated" |
| data | array | - | 是 | 协助请求列表数组 |
| data[].requesterUuid | string | - | 是 | 请求协助者的用户UUID |
| data[].templateId | string | - | 是 | 模板ID |
| data[].templateContent | string | - | 是 | 模板内容 |
| data[].show | boolean | true | 是 | 是否在列表中显示 |

**触发时机**：协助列表发生变化时自动广播给所有客户端（如创建、加入、结束协助时）

---

#### 13. error（错误消息）

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| event | string | - | 是 | 事件类型，固定值 "error" |
| data | object | - | 是 | 错误数据对象 |
| data.message | string | - | 是 | 错误消息描述 |

**触发时机**：发生错误时（如消息格式错误、用户不存在、协助请求不存在等）

**常见错误消息**：
- "消息格式错误"：客户端发送的消息格式不正确
- "用户不存在"：指定的用户UUID不存在
- "接收者不存在"：消息接收者不在线
- "协助请求不存在"：指定的协助请求不存在
- "未知的事件类型"：客户端发送了未定义的事件类型

---

## 技术栈

- **框架**：NestJS 10.x
- **WebSocket**：原生 WebSocket (ws)
- **语言**：TypeScript 5.x
- **运行时**：Node.js

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run start:dev
```

### 生产模式构建

```bash
npm run build
npm run start:prod
```

### 默认端口

服务器默认运行在 `http://localhost:3000`

WebSocket 连接地址：`ws://localhost:3000`

## 消息格式

所有 WebSocket 消息都采用 JSON 格式：

**客户端发送格式**：
```json
{
  "event": "事件名称",
  "data": {
    // 事件数据
  }
}
```

**服务端发送格式**：
```json
{
  "event": "事件名称",
  "data": {
    // 事件数据
  }
}
```

## 注意事项

### WebSocket 相关
1. **分片传输**：当内容超过 10000 字符时，会自动分割为多个分片，客户端需要接收所有分片后重组
2. **用户UUID**：每个连接的用户都会获得一个唯一的 UUID，用于标识用户
3. **协助状态**：一个用户同时只能请求一次协助或加入一次协助
4. **连接断开**：用户断开连接时，会自动清理相关资源并更新协助状态
5. **错误处理**：所有错误都会通过 `error` 事件返回，客户端应监听此事件

### 文件下载相关
1. **文件存储**：文件存储在服务器的 `uploads` 目录中，文件名格式为 `{fileId}_{filename}`
2. **文件清理**：建议定期清理过期文件，可通过 `FileService.cleanupOldFiles()` 方法实现
3. **文件类型限制**：目前仅支持 `js`、`css`、`html` 三种文件类型
4. **下载链接**：下载链接为相对路径，需要加上服务器地址（如：`http://localhost:3000/api/files/{fileId}/download`）
5. **文件大小**：没有文件大小限制，但建议控制文件大小以避免服务器资源问题

## 许可证

MIT
