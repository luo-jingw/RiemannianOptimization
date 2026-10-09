# Plan

Plan Status: completed

# Problem

## Current

- `notes/` 保存课程原始资料：Lecture 2/3 讲义、16 页手写笔记、14 张板书、Rudin §9.22–9.29。
- `docs/knowledge-map.md` 给出从拓扑到 retraction 的依赖树与学习路径。
- 项目内尚无视频内容、构建代码或渲染环境；Kokoro 与 torch 未安装。
- 可用环境：Node 24、ffmpeg 4.4、google-chrome、RTX 4060 8GB、uv、Python 3.10。

## Problem

学习者能读懂单条定义，但不理解定理为何需要、证明每一步在做什么。需要一套从基础出发的讲解视频，完整讲证明，并用动画和反例说明每个条件的必要性。课程笔记会继续增加，视频系列必须能追加新集，而不改动已交付的集。

## Goal

- 一个系列视频，覆盖课程到 retraction 定义为止的全部内容，分为 6 集。
- 每个定理包含：动机 → 陈述 → 完整证明 → 条件必要性的反例动画 → 后续用途。
- 英文 Kokoro 女声旁白（音色 `af_heart`）；烧录双语字幕，英文行在上、中文行在下；另附双语 SRT。
- 原创程序合成背景音乐：按章节语义类别切换织体，旁白包络驱动避让。
- 1920×1080，30 fps，H.264/AAC MP4。
- 新增笔记只需在 `content/series.json` 追加一集并新建该集目录；共享引擎接口不变。

# Structure

## Modules

| 模块 | 职责 |
|---|---|
| Series Registry | 系列中集的顺序、ID、标题、状态 |
| Glossary | 术语 ID → 英文、中文、显示符号、旁白读法；跨集共享 |
| Episode Content | 每集的分镜（内容设计）与英文脚本（旁白 + 逐句中文） |
| Content Validator | 校验脚本结构、术语引用、分句与译文数量、跨集前置依赖闭合 |
| Narration Builder | 分句 → Kokoro 合成 → 句级 WAV 与声音来源记录 |
| Timeline Builder | 由实测句长生成章节与字幕时间轴 |
| Subtitle Writer | 由时间轴生成双语 SRT |
| Music Composer | 由时间轴与章节音乐类别程序合成原创配乐 |
| Audio Mixer | 拼接旁白、按旁白包络对配乐做避让、响度归一，输出整集音轨 |
| Player | 浏览器端 `draw(t)`：Three.js 几何层 + KaTeX 公式层 + 字幕层 |
| Scene Library | 可复用的数学画面构件（坐标轴、曲线、球面、切平面、chart 映射、矩阵） |
| Episode Scenes | 每集每章一个场景文件，实现分镜的画面事件 |
| Frame Capture | 无头 Chrome 逐帧调用 `draw(t)` 截图，送入 ffmpeg 生成无声视频 |
| Muxer | 合成视频 + 音轨 + SRT 字幕流 → 版本化 MP4 与封面帧 |
| Review | 每集 QA 记录 |

## Responsibilities

- 内容（文字、证明、画面意图）只在 `content/` 中编辑。
- 所有生成产物只由对应构建器写入 `build/`；交付物只由 Muxer 写入 `output/`。
- `player/` 只读取 `content/` 与 `build/`，不写任何内容文件。

## State Ownership

| 状态 | 唯一写入者 | 文件 |
|---|---|---|
| 集顺序与状态 | Series Registry（手工编辑） | `content/series.json` |
| 术语表 | Glossary（手工编辑） | `content/glossary.json` |
| 分镜 | Episode Content | `content/episodes/<eid>/storyboard.md` |
| 旁白与逐句译文 | Episode Content | `content/episodes/<eid>/story.en.json` |
| 句级 WAV、声音来源 | Narration Builder | `build/<eid>/en/audio/sentences/`、`build/<eid>/en/voice-provenance.json` |
| 时间轴 | Timeline Builder | `build/<eid>/en/timeline.json` |
| SRT | Subtitle Writer | `build/<eid>/en/captions.srt` |
| 旁白轨 | Audio Mixer | `build/<eid>/en/audio/narration.wav` |
| 配乐轨 | Music Composer | `build/<eid>/en/audio/music.wav` |
| 整集音轨 | Audio Mixer | `build/<eid>/en/audio/mix.wav` |
| 无声视频 | Frame Capture | `build/<eid>/en/render/video.mp4` |
| QA 记录 | Review | `build/<eid>/en/qa/review.md` |
| 交付成片 | Muxer | `output/<eid>/v<N>/` |

# Interface

## Interfaces

- `content/series.json`：`{ "title": str, "episodes": [{ "id": str, "order": int, "title": str, "status": "planned" | "scripted" | "delivered" }] }`
- `content/glossary.json`：`{ "terms": [{ "id": str, "en": str, "zh": str, "symbol": str, "spoken": str }] }`
- `content/episodes/<eid>/story.en.json`：

  ```json
  {
    "episode": "e04-implicit-level-sets",
    "title": "...",
    "voice": "af_heart",
    "rate": 1.0,
    "scenes": [
      {
        "id": "c03-ift-proof",
        "chapter": "...",
        "title": "...",
        "music": "proof",
        "terms": ["implicit-function-theorem"],
        "sentences": [
          { "en": "Spoken English sentence.", "zh": "对应中文。" }
        ]
      }
    ]
  }
  ```

  分句由作者显式写成 `sentences` 数组，配音与字幕共用同一列表，不依赖自动断句。
  `music` 取值：`motivation | definition | proof | counterexample | recap`。
- Python 结构（`pipeline/rvideo/schema/`）：`SeriesManifest`、`GlossaryTerm`、`Story`、`StoryScene`、`StorySentence`、`Timeline`、`TimelineChapter`、`TimelineCaption`、`VoiceProvenance`，均为 `dataclass`。
- TypeScript 结构（`player/src/core/`）：

  ```ts
  interface Timeline { language: "en"; duration: number; chapters: TimelineChapter[]; captions: TimelineCaption[] }
  interface TimelineChapter { id: string; index: number; start: number; end: number; sentenceStarts: number[] }
  interface TimelineCaption { start: number; end: number; text: string; translation: string }
  interface SceneContext { localTime: number; duration: number; sentenceStarts: number[]; layers: SceneLayers }
  interface Scene { id: string; setup(layers: SceneLayers): void; draw(ctx: SceneContext): void; teardown(): void }
  ```

  画面事件锚定到本章第 i 句的开始时间 `sentenceStarts[i]`，不按章节时长等分。
- 页面全局入口：`window.renderAt(t: number): Promise<void>`，在字体与公式就绪后绘制时刻 t。

## Inputs

- `notes/`（只读）、`docs/knowledge-map.md`、`content/`。
- Kokoro-82M 权重（Hugging Face 公共仓库 `hexgrad/Kokoro-82M`，无需凭据）。

## Outputs

- `output/<eid>/v<N>/<eid>.en.mp4`、`<eid>.en.srt`、`cover.png`、`manifest.json`（源文件校验和、时长、流信息）。

## State Changes

- 集状态：`planned → scripted → delivered`。由 `content/series.json` 记录。
- 笔记更新影响已交付集时，生成 `v<N+1>`，不覆盖 `v<N>`。

# Flow

## Main Flow

```
content/episodes/<eid>/story.en.json
  → pipeline validate        (结构、术语、跨集依赖)
  → pipeline narrate         → build/<eid>/en/audio/sentences/*.wav + voice-provenance.json
  → pipeline timeline        → build/<eid>/en/timeline.json
  → pipeline subtitles       → build/<eid>/en/captions.srt
  → pipeline music           → build/<eid>/en/audio/music.wav
  → pipeline mix             → build/<eid>/en/audio/{narration,mix}.wav
  → player preview           (Vite 开发服务器，?episode=<eid>，人工/截图检查)
  → player capture           → build/<eid>/en/render/video.mp4
  → pipeline mux             → output/<eid>/v<N>/
  → review                   → build/<eid>/en/qa/review.md
```

`pipeline/rvideo/cli/main.py` 提供子命令 `validate | narrate | timeline | subtitles | music | mix | mux`，每个子命令只调用一个模块。

## 系列内容（6 集，结尾停在 retraction）

每集各章都遵循：直觉 → 定义 → 证明 → 必要性反例 → 用途。

| 集 | ID | 章节要点 | 必要性 / 反例动画 |
|---|---|---|---|
| E01 | `e01-topology` | 约束优化问题的动机；度量与开球；拓扑公理；收敛；连续（证明与 ε-δ 等价）；同胚 | 欧氏梯度步离开球面；经纬度在极点退化；无穷交 ∩(−1/n,1/n)={0} 不开；平凡拓扑中数列收敛到任意点；[0,2π)→S¹ 是连续双射但逆不连续 |
| E02 | `e02-smooth-manifolds` | chart；拓扑流形；转移映射；光滑图册；光滑映射（证明与 chart 选择无关）；微分同胚；内蕴与外蕴 | S¹ 至少需要两个 chart；双原点直线违反 Hausdorff；chart id 与 x³ 不相容，导致"光滑"产生歧义；x³ 是同胚但不是微分同胚；O(n) 的 chart 难以手造 |
| E03 | `e03-inverse-function` | 导数是最佳线性近似；反函数定理陈述；压缩映射原理及证明；反函数定理完整证明（Rudin 9.24） | x³ 在 0 处（逆存在但不可微）；x² 折叠；极坐标映射处处局部可逆但非全局单射；x/2 在 (0,1] 上无不动点（需要完备性）；x+2x²sin(1/x)（需要 C¹） |
| E04 | `e04-implicit-level-sets` | 圆的局部求解；线性隐函数定理；由反函数定理证明隐函数定理；Dg 公式；正则值；正则水平集定理证明；球面 | 圆在 (±1,0) 处不能解出 y，但能解出 x；x²−y²=0 的交叉点；y²−x³=0 的尖点；(xᵀx−1)² 的零集是球面但 0 不是正则值（定理只给充分条件） |
| E05 | `e05-tangent-orthogonal` | 曲线速度定义的切向量；T_pM = ker Dh(p) 的两个包含关系证明；秩–零化度；球面 x^⊥；O(n) 的微分、满射性、维数、R·Skew(n)；SO(n) 与 SO(3) | (xᵀx−1)² 使 ker Dh = ℝⁿ，比切空间大；若陪域取 ℝ^{n×n}，DF 永不满射，所以陪域必须取 Sym(n)；n=2 时 Ω 对应旋转速度 |
| E06 | `e06-gradient-retraction` | 两个问题（往哪走、怎么走）；用曲线定义微分并证明良定义与线性；对偶空间；Riesz 表示定理证明；黎曼度量；黎曼梯度；Cauchy–Schwarz 最速性；retraction 定义；γ'(0)=v 证明；下降性 −‖grad f‖² | 余向量不能直接作为步进方向；同一个 df 在不同内积下给出不同梯度方向；x − α·grad 离开球面；用球面归一化作为 retraction 的例子并验证两个条件 |

# Code Mapping

## Modules

```
EECE7223RiemannianOptimization/
├── notes/                                   原始课程资料（只读）
├── docs/
│   ├── knowledge-map.md                     概念依赖树
│   └── video-architecture.md                已验证的制作架构（Phase 12 写入）
├── content/                                 唯一手工编辑的内容源
│   ├── series.json                          Series Registry
│   ├── glossary.json                        Glossary
│   ├── pronunciation.json                   TTS 读音词典（仅作用于合成输入）
│   └── episodes/
│       └── <eid>/
│           ├── storyboard.md                分镜：依赖、每章目标、证明结构、画面事件
│           └── story.en.json                英文旁白 + 逐句中文
├── pipeline/                                Python 构建链
│   ├── pyproject.toml
│   └── rvideo/
│       ├── __init__.py                      仅导出
│       ├── schema/{series,glossary,story,timeline,provenance}.py
│       ├── validate/content_validator.py
│       ├── narration/kokoro_synthesizer.py
│       ├── timing/timeline_builder.py
│       ├── subtitles/srt_writer.py
│       ├── music/music_composer.py
│       ├── audio/narration_mixer.py
│       ├── delivery/muxer.py
│       └── cli/main.py
├── player/                                  TypeScript 渲染端
│   ├── package.json, tsconfig.json, vite.config.ts, index.html
│   ├── (fonts)                              @fontsource/inter、@fontsource/noto-sans-sc、katex 字体，经 npm 本地打包
│   ├── src/
│   │   ├── main.ts                          载入集、注册场景、暴露 renderAt
│   │   ├── core/{Frame,Timeline,Scene,SceneLayers,SceneRegistry,EpisodeLoader,EpisodeRenderer,PlaceholderScene,PreviewClock}.ts
│   │   ├── layers/{StageLayer,FormulaLayer,CaptionLayer,TitleLayer}.ts
│   │   ├── primitives/                      Axes2D, Arrow, ParametricCurve, SphereMesh,
│   │   │                                    TangentPlane, ChartMap, MatrixGrid, Easing …
│   │   └── episodes/
│   │       ├── registry.ts                  集 ID → 场景表（追加新集加一行）
│   │       ├── e00-test/                    开发夹具：覆盖全部基础构件
│   │       └── <eid>/{index.ts, cNN-*.ts}   每章一个场景文件
│   └── render/{PlayerSession,capture,stills}.ts   无头 Chrome：成片捕获；审查截图与确定性检查
├── build/                                   生成物（不入库）
│   └── <eid>/en/{audio/,timeline.json,captions.srt,render/,qa/}
├── output/                                  交付物（版本化，不入库）
│   └── <eid>/v<N>/
├── .venv/                                   Python 环境（uv，含 kokoro、torch）
├── PROJECT.md, plan.md, issues.md, opportunities.md, AGENTS.md
└── .gitignore                               build/ output/ .venv/ player/node_modules/
```

追加新集：`series.json` 加一行 → `content/episodes/<new-eid>/` → `player/src/episodes/<new-eid>/` → `registry.ts` 加一行。共享目录 `pipeline/`、`player/src/{core,layers}` 不变；`primitives/` 只追加构件。

## Interfaces

| 接口 | 文件 |
|---|---|
| series / glossary / story / timeline / provenance 结构 | `pipeline/rvideo/schema/*.py` |
| Timeline、Scene、SceneContext 类型 | `player/src/core/Timeline.ts`、`player/src/core/Scene.ts` |
| `window.renderAt` | `player/src/main.ts` |
| CLI 子命令 | `pipeline/rvideo/cli/main.py` |
| 帧捕获入口 | `player/render/capture.ts` |

## State

见 Structure → State Ownership；每项状态对应唯一写入文件。

# Implementation

## Phase 1

Phase Status: completed

Round: 1

### Goal

建立目录骨架、`.gitignore`、`git init`，以及 Python/TS 两侧的结构定义；写入 `series.json`（6 集，状态 planned）和 glossary 初版。

### Files

`.gitignore`、`content/series.json`、`content/glossary.json`、`pipeline/pyproject.toml`、`pipeline/rvideo/__init__.py`、`pipeline/rvideo/schema/*.py`、`player/src/core/Timeline.ts`、`player/src/core/Scene.ts`

### Structures

`SeriesManifest`、`GlossaryTerm`、`Story`、`StoryScene`、`StorySentence`、`Timeline`、`TimelineChapter`、`TimelineCaption`、`VoiceProvenance`

### Affected Modules

Series Registry、Glossary、schema

### Dependencies

无

### Observation

用 schema 加载 `series.json` 与 `glossary.json`，打印集数、术语数、重复 ID 数。

## Phase 2

Phase Status: completed

Round: 2

### Goal

写出 6 集分镜：内容依赖、每章 question / requires / teaching_sequence / 证明步骤 / 必要性反例 / visual_events / outcome_check / 来源位置。

### Files

`content/episodes/e0{1..6}-*/storyboard.md`

### Structures

分镜每章字段（见 threejs-video `content-contracts.md`），另加 `proof_steps` 与 `necessity`。

### Affected Modules

Episode Content

### Dependencies

Phase 1

### Observation

逐章列出 requires 引用及其首次建立位置；未闭合的引用数必须为 0。每个定理都要有 proof_steps 与 necessity。数学内容对照 `notes/` 来源位置核对。

## Phase 3

Phase Status: completed

Round: 2

### Goal

建立音频链：`.venv`（kokoro + torch CUDA）、Kokoro 合成、时间轴、SRT、原创配乐合成、避让混音、内容校验器。

### Files

`pipeline/rvideo/{validate,narration,timing,subtitles,music,audio}/*.py`、`pipeline/rvideo/cli/main.py`

### Structures

`VoiceProvenance`（模型仓库与修订、权重 SHA-256、音色、语速、采样率、每句时长与峰值）

### Affected Modules

Content Validator、Narration Builder、Timeline Builder、Subtitle Writer、Music Composer、Audio Mixer

### Dependencies

Phase 1

### Observation

用一段含数学术语的测试脚本输出：句数、每句时长、峰值 dBFS、采样率；`observe_timeline.py --require-translation` 的结果；用 Whisper 转写结果与原文对照，观察 "homeomorphism"、"R transpose R" 等读法；配乐与混音的 RMS/峰值 dBFS、避让深度，并截取频谱图。

## Phase 4

Phase Status: completed

Round: 2

### Goal

建立渲染端：Vite + Three.js + KaTeX，各个图层、基础构件、预览时钟、无头 Chrome 帧捕获、Muxer。

### Files

`player/**`（除 `src/episodes/`）、`pipeline/rvideo/delivery/muxer.py`

### Structures

`Scene`、`SceneContext`、`SceneLayers`、`renderAt`

### Affected Modules

Player、Scene Library、Frame Capture、Muxer

### Dependencies

Phase 1

### Observation

用测试场景渲染 5 秒：ffprobe 报告的帧数、时长和尺寸；同一时刻重复渲染两次，帧哈希应一致；实测捕获吞吐（帧/秒）；中英字幕与 KaTeX 公式截图。

## Phase 5

Phase Status: completed

Round: 3

### Goal

代表样片：E04 第 3 章"由反函数定理证明隐函数定理"（公式最密、证明步骤最多），跑通 脚本 → 配音 → 时间轴 → 场景 → 捕获 → mux 全链。

### Files

`content/episodes/e04-implicit-level-sets/story.en.json`（仅该章）、`player/src/episodes/e04-implicit-level-sets/c03-*.ts`

### Structures

无新增

### Affected Modules

Episode Content、Episode Scenes

### Dependencies

Phase 2、Phase 3、Phase 4

### Observation

样片 MP4 的流信息；关键帧截图（公式最密处、字幕最长处）；开头、中段、结尾的同步检查；`build/e04-implicit-level-sets/en/qa/review.md`。

## Phase 6

Phase Status: completed

Round: 4

### Goal

E01 全集内容与画面：按 `docs/scene-authoring.md` 写出 `story.en.json` 全部章节与每章场景，构建音频，逐章截图审查并修正。由独立子代理执行；与同轮其他集的修改文件互不重叠。

### Files

`content/episodes/e01-topology/story.en.json`、`player/src/episodes/e01-topology/**`、`build/e01-topology/**`

### Structures

无新增共享结构；本集专用辅助代码放在 `player/src/episodes/e01-topology/lib/`

### Affected Modules

Episode Content、Episode Scenes

### Dependencies

Phase 5

### Observation

`rvideo validate/audio/transcribe` 输出；每个视觉事件至少一张截图，`stills.ts` 报告 `determinism_mismatches: []` 与 `history_mismatches: []`；`build/e01-topology/en/qa/review.md` 记录缺陷与关闭证据。

## Phase 7

Phase Status: completed

Round: 4

### Goal

E02 全集内容与画面：按 `docs/scene-authoring.md` 写出 `story.en.json` 全部章节与每章场景，构建音频，逐章截图审查并修正。由独立子代理执行；与同轮其他集的修改文件互不重叠。

### Files

`content/episodes/e02-smooth-manifolds/story.en.json`、`player/src/episodes/e02-smooth-manifolds/**`、`build/e02-smooth-manifolds/**`

### Structures

无新增共享结构；本集专用辅助代码放在 `player/src/episodes/e02-smooth-manifolds/lib/`

### Affected Modules

Episode Content、Episode Scenes

### Dependencies

Phase 5

### Observation

`rvideo validate/audio/transcribe` 输出；每个视觉事件至少一张截图，`stills.ts` 报告 `determinism_mismatches: []` 与 `history_mismatches: []`；`build/e02-smooth-manifolds/en/qa/review.md` 记录缺陷与关闭证据。

## Phase 8

Phase Status: completed

Round: 4

### Goal

E03 全集内容与画面：按 `docs/scene-authoring.md` 写出 `story.en.json` 全部章节与每章场景，构建音频，逐章截图审查并修正。由独立子代理执行；与同轮其他集的修改文件互不重叠。

### Files

`content/episodes/e03-inverse-function/story.en.json`、`player/src/episodes/e03-inverse-function/**`、`build/e03-inverse-function/**`

### Structures

无新增共享结构；本集专用辅助代码放在 `player/src/episodes/e03-inverse-function/lib/`

### Affected Modules

Episode Content、Episode Scenes

### Dependencies

Phase 5

### Observation

`rvideo validate/audio/transcribe` 输出；每个视觉事件至少一张截图，`stills.ts` 报告 `determinism_mismatches: []` 与 `history_mismatches: []`；`build/e03-inverse-function/en/qa/review.md` 记录缺陷与关闭证据。

## Phase 9

Phase Status: completed

Round: 4

### Goal

E04 全集内容与画面（保留并复用已完成的 `c03-ift-proof` 章节与其语音）：按 `docs/scene-authoring.md` 写出 `story.en.json` 全部章节与每章场景，构建音频，逐章截图审查并修正。由独立子代理执行；与同轮其他集的修改文件互不重叠。

### Files

`content/episodes/e04-implicit-level-sets/story.en.json`、`player/src/episodes/e04-implicit-level-sets/**`、`build/e04-implicit-level-sets/**`

### Structures

无新增共享结构；本集专用辅助代码放在 `player/src/episodes/e04-implicit-level-sets/lib/`

### Affected Modules

Episode Content、Episode Scenes

### Dependencies

Phase 5

### Observation

`rvideo validate/audio/transcribe` 输出；每个视觉事件至少一张截图，`stills.ts` 报告 `determinism_mismatches: []` 与 `history_mismatches: []`；`build/e04-implicit-level-sets/en/qa/review.md` 记录缺陷与关闭证据。

## Phase 10

Phase Status: completed

Round: 4

### Goal

E05 全集内容与画面：按 `docs/scene-authoring.md` 写出 `story.en.json` 全部章节与每章场景，构建音频，逐章截图审查并修正。由独立子代理执行；与同轮其他集的修改文件互不重叠。

### Files

`content/episodes/e05-tangent-orthogonal/story.en.json`、`player/src/episodes/e05-tangent-orthogonal/**`、`build/e05-tangent-orthogonal/**`

### Structures

无新增共享结构；本集专用辅助代码放在 `player/src/episodes/e05-tangent-orthogonal/lib/`

### Affected Modules

Episode Content、Episode Scenes

### Dependencies

Phase 5

### Observation

`rvideo validate/audio/transcribe` 输出；每个视觉事件至少一张截图，`stills.ts` 报告 `determinism_mismatches: []` 与 `history_mismatches: []`；`build/e05-tangent-orthogonal/en/qa/review.md` 记录缺陷与关闭证据。

## Phase 11

Phase Status: completed

Round: 4

### Goal

E06 全集内容与画面：按 `docs/scene-authoring.md` 写出 `story.en.json` 全部章节与每章场景，构建音频，逐章截图审查并修正。由独立子代理执行；与同轮其他集的修改文件互不重叠。

### Files

`content/episodes/e06-gradient-retraction/story.en.json`、`player/src/episodes/e06-gradient-retraction/**`、`build/e06-gradient-retraction/**`

### Structures

无新增共享结构；本集专用辅助代码放在 `player/src/episodes/e06-gradient-retraction/lib/`

### Affected Modules

Episode Content、Episode Scenes

### Dependencies

Phase 5

### Observation

`rvideo validate/audio/transcribe` 输出；每个视觉事件至少一张截图，`stills.ts` 报告 `determinism_mismatches: []` 与 `history_mismatches: []`；`build/e06-gradient-retraction/en/qa/review.md` 记录缺陷与关闭证据。

## Phase 12

Phase Status: completed

Round: 5

### Goal

集成与交付：注册各集场景（`registry.ts`），更新 `series.json` 状态，逐集捕获、mux 为 v1，抽查成片帧与完整解码，更新各集 QA 记录。

### Files

`player/src/episodes/registry.ts`、`content/series.json`、`output/<eid>/v1/`、`build/<eid>/en/render/`、`build/<eid>/en/qa/review.md`

### Structures

无新增

### Affected Modules

Series Registry、Frame Capture、Muxer、Review

### Dependencies

Phase 6、Phase 7、Phase 8、Phase 9、Phase 10、Phase 11

### Observation

每集：ffprobe 流信息、完整解码退出码、积分响度、开头/中段/结尾抽帧检查、manifest.json。

## Phase 13

Phase Status: completed

Round: 6

### Goal

记录已验证的制作架构与追加新集的步骤；更新 PROJECT.md 的 Onboarding 与 Environment。

### Files

`docs/video-architecture.md`、`PROJECT.md`

### Structures

无新增

### Affected Modules

文档

### Dependencies

Phase 12

### Observation

按文档步骤列出追加一集 `e07-*` 需要改动的文件；共享代码（`pipeline/`、`player/src/{core,layers,primitives}`）改动数应为 0。
