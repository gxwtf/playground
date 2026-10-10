# 广坊新人 Playground

这是给**刚加入广学五题坊开发组**的同学准备的练手项目。你只需要做一件事：**把自己的名字加进开发者名单**。

别看这件事小，走完一遍，你就把新人要熟悉的开发流程全过了一遍：

1. 把仓库拉到本地；
2. 让 AI（TRAE）帮你改一个文件；
3. 新建分支、提交、推送；
4. 看着 GitHub Actions 自动校验你的改动；
5. 校验通过后，你的名字被自动合并进主分支，并出现在网页上。

页面地址：<https://gxwtf.github.io/playground/>

---

## 规则（先看这一条）

- ✅ **只允许修改一个文件：`developers.json`**（开发者名单）。
- ⛔ 其它文件全部是**受保护文件**，不要改：
  `index.html`、`app.js`、`style.css`、`.nojekyll`、`package.json`、`scripts/**`、`.github/**`、`README.md`。
- 📝 名单格式：JSON 数组，每条记录**恰好**三个字段：

  ```json
  { "name": "你的昵称", "github": "你的GitHub用户名", "joinedAt": "2026-10-10" }
  ```

  - `name`：1–24 个字符，展示用（欢迎语里就是它），首尾不要有空格；
  - `github`：**必须是你自己的 GitHub 用户名**（大小写不敏感），会用来做身份校验；
  - `joinedAt`：加入日期，`YYYY-MM-DD`。
- ➕ 一次**只能追加你自己的一条记录**，不能删改别人的。
- 🌿 分支名建议用 `join/<你的GitHub用户名>`。

> 只要违反上面任意一条，GitHub Actions 就会**拒绝合并**，并自动开一个 Issue 告诉你哪里错了 —— 所以放心大胆地试。

---

## 新手部分（照做就行）

把下面这段话**整段复制**给 TRAE（把 `<>` 里的内容换成你自己的）：

```text
帮我克隆 git@github.com:gxwtf/playground.git 这个仓库。

然后按下面的要求操作：
1. 在 developers.json 的数组末尾追加一条我自己的记录：
   { "name": "<我的昵称>", "github": "<我的GitHub用户名>", "joinedAt": "<今天的日期，格式 YYYY-MM-DD>" }
2. 除了 developers.json，不要修改任何其它文件。
3. 新建分支 join/<我的GitHub用户名>，把改动提交（commit）并 push 到 origin。

完成后告诉我：我应该去哪里看 GitHub Actions 的校验结果。
```

推送完成后：

1. 打开仓库的 **Actions** 页面，找到最新一次「校验开发者名单」运行；
2. 绿色 ✅：点进去能看到「🎉 欢迎 <你的昵称> 加入广坊开发组！」；
3. 红色 ❌：打开自动创建的 Issue（标题是「❌ 加入申请未通过：<你的用户名>」），按里面的中文提示改好，再重新 push；
4. 校验通过后，主分支会自动合并，稍等片刻刷新 <https://gxwtf.github.io/playground/> 就能看到你自己。

---

## 老手部分（想自己敲命令的看这里）

```bash
# 1. 拉取仓库
git clone git@github.com:gxwtf/playground.git
cd playground

# 2. 新建分支（用你自己的 GitHub 用户名）
git checkout -b join/<你的GitHub用户名>

# 3. 编辑 developers.json，在数组末尾追加一条你自己的记录

# 4. 本地自查（可选，但强烈建议）
npm run validate

# 5. 提交并推送
git add developers.json
git commit -m "join: <你的昵称>"
git push -u origin join/<你的GitHub用户名>
```

本地预览页面：

```bash
npm run preview   # 然后打开 http://localhost:5173
```

### 校验器都检查了什么

`scripts/validate.mjs`（本地与 CI 共用，纯 Node、零依赖）：

1. 相对主分支，**只允许改动 `developers.json`**，其它文件一律拒绝；
2. `developers.json` 必须是合法 JSON、顶层是数组、字段与格式正确、`github` 不重复；
3. **只增不改不删**：已有记录必须原样保留；
4. **只新增一条**记录；
5. **只能加自己**：新增记录的 `github` 必须等于推送者的 GitHub 用户名。

> 关于「阻止 push」：GitHub 无法在你 `git push` 到新分支之前拦截（分支保护只能约束合并）。所以这里的实际约束是：**校验不通过 → 不会合并进主分支**，同时 Actions 会失败并开出 Issue；你本地也可以先用 `npm run validate` 自查。效果一样：不合规的东西进不了主分支。

---

## 卡住了怎么办

| 现象 / 报错 | 原因 | 怎么办 |
| --- | --- | --- |
| `git: command not found` | 没装 Git | 先完成「广坊 AI 编程教程」里的「安装其它开发工具」一章 |
| `Permission denied (publickey)` | SSH key 没配好 | 参见教程里的 GitHub / Watt Toolkit 章节，或改用 HTTPS 地址克隆 |
| 校验提示「检测到被改动的受保护文件」 | 顺手改了别的文件 | 用 `git checkout -- <文件>` 还原，只保留 `developers.json` 的改动 |
| 校验提示「不是合法的 JSON」 | 漏了逗号、用了中文引号、末尾多了逗号 | 对照 `developers.json` 里已有的记录逐字检查标点（必须是英文 `,` `"`） |
| 校验提示「github 必须是合法的 GitHub 用户名」 | 用户名写错或带了 `@` | 填纯用户名，例如 `zhangsan`，不要写 `@zhangsan` |
| 校验提示「github 必须是你自己的 GitHub 用户名」 | 填的是别人的用户名 | 必须填**你自己**的 GitHub 用户名 |
| 校验提示「一次只能新增一条记录」 | 加了多条 | 只保留你自己那一条 |
| 校验提示「没有新增开发者记录」 | 分支和主分支内容一样 | 确认真的改了 `developers.json`，并且**已提交**（`git status` 看是否还有未提交改动） |
| Actions 通过但网页没更新 | Pages 还在构建 | 等 1–2 分钟再刷新；仍不更新就看仓库 Settings → Pages 的状态 |
| 想重来一遍 | — | 新建一个干净的分支，从最新的 `main` 重新开始即可 |

---

## 维护者备注

`developers.json` 只有一个「人类可编辑」的文件，其余全部通过校验器保护。仓库需要以下一次性配置才能跑通自动合并与页面：

1. **Settings → Actions → General → Workflow permissions** 选 **Read and write permissions**（合并 job 需要推送 `main`）；
2. **Settings → Pages → Build and deployment → Source** 选 **Deploy from a branch**，分支 `main`、目录 `/ (root)`。