# DNS 配置指南 - fishtalk.app 部署到 Vercel

## 📝 前提条件

1. ✅ 您已经拥有域名 `fishtalk.app`
2. ✅ 代码已推送到 GitHub 的 fishtalk 分支
3. ✅ Vercel 项目已创建并连接到 GitHub 仓库

---

## 🚀 方法一：推荐方式 - 使用 Vercel Nameservers（最简单）

### 步骤 1: 在 Vercel 添加域名

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目
3. 点击顶部的 **"Settings"** 标签
4. 在左侧菜单选择 **"Domains"**
5. 点击 **"Add"** 按钮
6. 输入 `fishtalk.app`，点击 **"Add"**

### 步骤 2: 选择配置方式

Vercel 会显示两个选项：

**选择**: **"Use Vercel Nameservers"** （推荐）

Vercel 会给您提供两个 nameserver 地址，类似：
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### 步骤 3: 更新域名注册商的 Nameservers

去您购买域名的地方（如 GoDaddy、Namecheap、阿里云、腾讯云等）：

#### 以阿里云为例：
1. 登录 [阿里云控制台](https://dns.console.aliyun.com/)
2. 进入 **域名管理** → 找到 `fishtalk.app`
3. 点击 **管理** → **DNS 修改**
4. 将 DNS 服务器修改为 Vercel 提供的：
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
5. 保存修改

#### 以 Namecheap 为例：
1. 登录 Namecheap
2. Dashboard → Domain List → 找到 `fishtalk.app`
3. 点击 **Manage**
4. 在 **Nameservers** 部分选择 **Custom DNS**
5. 输入 Vercel 的 nameservers
6. 点击保存（✓）

#### 以腾讯云为例：
1. 登录腾讯云控制台
2. **域名注册** → **我的域名**
3. 找到 `fishtalk.app`，点击 **管理**
4. **DNS 服务器**，点击 **修改 DNS 服务器**
5. 修改为 Vercel 的 nameservers
6. 确认修改

### 步骤 4: 等待生效

- ⏰ **DNS 传播时间**: 5 分钟 - 48 小时（通常 15-30 分钟）
- ✅ Vercel 会自动配置所有必要的记录
- 🔒 自动配置 SSL 证书（Let's Encrypt）

---

## 🔧 方法二：手动配置 DNS 记录（高级）

如果您想保留现有的 DNS 提供商（如阿里云 DNS、Cloudflare），可以手动添加记录。

### 步骤 1: 获取 Vercel 的配置信息

在 Vercel 的 **Domains** 设置页面，选择手动配置，Vercel 会显示需要添加的记录。

### 步骤 2: 在 DNS 提供商添加记录

#### 配置根域名（fishtalk.app）

**选项 A: 使用 A 记录**
```
类型:   A
名称:   @  (或留空)
值:     76.76.21.21
TTL:    3600 (或自动)
```

**选项 B: 使用 CNAME 记录**（如果 DNS 提供商支持根域名 CNAME）
```
类型:   CNAME
名称:   @
值:     cname.vercel-dns.com
TTL:    3600
```

#### 配置 www 子域名（可选但推荐）

```
类型:   CNAME
名称:   www
值:     cname.vercel-dns.com
TTL:    3600
```

### 步骤 3: 添加 SSL 验证记录（如需要）

Vercel 可能要求添加一个 TXT 记录来验证域名所有权：

```
类型:   TXT
名称:   _vercel
值:     (Vercel 提供的验证码)
TTL:    3600
```

### 阿里云 DNS 配置示例

1. 登录 [阿里云 DNS 控制台](https://dns.console.aliyun.com/)
2. 找到 `fishtalk.app` → 点击 **解析设置**
3. 点击 **添加记录**

**记录 1 - 主域名**:
```
记录类型: A
主机记录: @
解析线路: 默认
记录值: 76.76.21.21
TTL: 10 分钟
```

**记录 2 - www 子域名**:
```
记录类型: CNAME
主机记录: www
解析线路: 默认
记录值: cname.vercel-dns.com
TTL: 10 分钟
```

**记录 3 - Vercel 验证**（如提示需要）:
```
记录类型: TXT
主机记录: _vercel
解析线路: 默认
记录值: (从 Vercel 复制)
TTL: 10 分钟
```

### Cloudflare 配置示例

1. 登录 Cloudflare
2. 选择域名 `fishtalk.app`
3. 进入 **DNS** 标签
4. 点击 **Add record**

**记录 1**:
```
Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy status: DNS only (灰云)  ⚠️ 重要：不要开启代理
TTL: Auto
```

**记录 2**:
```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy status: DNS only (灰云)  ⚠️ 重要
TTL: Auto
```

⚠️ **Cloudflare 特别注意**: 必须关闭橙色云（代理模式），否则会与 Vercel 冲突！

---

## 🔍 验证 DNS 配置

### 方法 1: 使用在线工具

访问以下工具检查 DNS 记录：
- [DNSChecker.org](https://dnschecker.org/) - 查看全球 DNS 传播状态
- [WhatsMyDNS.net](https://whatsmydns.net/) - 检查 DNS 记录

输入 `fishtalk.app`，检查：
- A 记录是否指向 `76.76.21.21`
- CNAME 记录（www）是否指向 `cname.vercel-dns.com`

### 方法 2: 使用命令行

**Windows (PowerShell)**:
```powershell
# 查询 A 记录
nslookup fishtalk.app

# 查询 CNAME 记录
nslookup www.fishtalk.app

# 查询 TXT 记录
nslookup -type=TXT _vercel.fishtalk.app
```

**macOS/Linux**:
```bash
# 查询 A 记录
dig fishtalk.app A

# 查询 CNAME 记录
dig www.fishtalk.app CNAME

# 查询 TXT 记录
dig _vercel.fishtalk.app TXT
```

### 方法 3: 检查 Vercel 状态

在 Vercel 的 **Domains** 页面：
- ✅ 绿色勾 = 配置成功
- ⚠️ 黄色警告 = 配置中或有问题
- ❌ 红色叉 = 配置失败

---

## ⏱️ DNS 生效时间

| 操作类型 | 预计时间 |
|---------|---------|
| 修改 DNS 记录 | 5-30 分钟 |
| 更改 Nameservers | 4-48 小时 |
| SSL 证书签发 | 即时-10 分钟 |

**加速生效的方法**:
1. 降低 TTL 值（提前设置为 300 秒或 600 秒）
2. 清除本地 DNS 缓存
3. 使用无痕浏览模式测试

---

## 🧹 清除 DNS 缓存

### Windows:
```powershell
ipconfig /flushdns
```

### macOS:
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Linux:
```bash
sudo systemd-resolve --flush-caches
# 或
sudo service nscd restart
```

### Chrome 浏览器:
访问: `chrome://net-internals/#dns`  
点击 **"Clear host cache"**

---

## ❗ 常见问题

### 问题 1: DNS 已配置但网站无法访问

**检查**:
1. DNS 是否完全生效（使用 dnschecker.org）
2. Vercel 项目是否成功部署
3. 域名状态是否正常（未过期、未锁定）
4. 清除浏览器缓存和 DNS 缓存

### 问题 2: SSL 证书错误

**解决**:
1. 等待 5-10 分钟，Vercel 自动签发证书
2. 在 Vercel Domains 页面点击 **"Refresh Certificate"**
3. 确保 DNS 记录正确指向 Vercel

### 问题 3: www 和根域名行为不一致

**解决**:
1. 确保同时配置了 `@` 和 `www` 记录
2. 在 Vercel 中同时添加两个域名：
   - `fishtalk.app`
   - `www.fishtalk.app`
3. 设置重定向规则（Vercel 会自动处理）

### 问题 4: 使用 Cloudflare 但无法访问

**解决**:
- 必须关闭 Cloudflare 的 Proxy（橙色云改为灰色云）
- 或使用 Cloudflare 的 CNAME 设置

---

## 🎯 最终验证清单

配置完成后，请检查：

- [ ] 访问 `https://fishtalk.app` 能正常打开网站
- [ ] 访问 `https://www.fishtalk.app` 也能正常打开
- [ ] 浏览器地址栏显示 🔒 绿锁（SSL 有效）
- [ ] 页面标题显示 "FishTalk"
- [ ] 页面样式和功能正常
- [ ] 打开开发者工具无 CORS 错误
- [ ] 分享链接预览显示正确的域名

---

## 📞 需要帮助？

如果遇到问题：

1. **检查 Vercel 文档**: [Vercel Domains 文档](https://vercel.com/docs/concepts/projects/domains)
2. **查看部署日志**: Vercel Dashboard → 项目 → Deployments
3. **联系 Vercel 支持**: [Vercel Support](https://vercel.com/support)
4. **域名注册商支持**: 查看您域名提供商的 DNS 配置文档

---

**配置指南版本**: 1.0  
**更新日期**: 2025-11-07  
**目标域名**: fishtalk.app  
**目标平台**: Vercel




