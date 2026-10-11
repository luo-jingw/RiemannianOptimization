# E00 — Series Trailer

## 全集框架

- 核心问题：两分钟内让没看过系列的人明白：很多真实问题的参数不在平坦空间里，这个系列从头建立在弯曲空间上做优化所需的几何。
- 受众起点：知道"梯度下降"是什么；不要求任何流形知识。
- 主线：平坦世界 → 折叠成弯曲空间 → 六个真实应用 → 在弯曲地形上重建工具箱 → 系列画面蒙太奇 → 标题。
- 内容边界：只用一般性、公认的描述，不陈述具体定理，不列集数，不依赖当前已完成的剧集。应用场景的流形名称只作画面标签。
- 节拍：120 BPM，4/4，每小节 2 秒。旁白落在小节线上（下拍后 0.08 s）。段落长度以小节计，可按画面需要伸缩。
- 调性：由配乐模块安排，沿五度圈走满 12 个调，标题回到 C。画面中的五度圈图标与之同步。

| 段落 | 小节 | 时长 | 配乐类别 |
|---|---|---|---|
| s01-flat | 8 | 16 s | trailer-open |
| s02-fold | 7 | 14 s | trailer-fold |
| s03-gallery | 24 | 48 s | trailer-gallery（每 4 小节一个应用，6 个） |
| s04-toolkit | 16 | 32 s | trailer-toolkit |
| s05-montage | 8 | 16 s | trailer-montage |
| s06-title | 8 | 16 s | trailer-title |
| s07-credits | 4 | 8 s | trailer-credits |

## 画面通则

- 无章节卡、无片头片尾卡；字幕照常烧录（英文在上、中文在下）。
- 镜头持续缓慢运动（推、摇、环绕），在小节线上切换；同一段内用交叉淡化。
- 色彩沿用系列色板；背景加轻微径向渐变与远景变暗，营造景深。
- 右下角小号标签只写流形名称，不写公式推导。

## 段落

### s01-flat — 平坦世界

- 旁白（第 2 小节）："Optimization usually lives in flat space."
- 画面：
  - b0–b2：黑场中一张等高线图（二次型的椭圆等高线）从中心亮起，网格冷蓝。
  - b2–b6：一个橙色点沿梯度下降折线一步步走向中心，每一步落在拍点上；步长逐渐变小。
  - b6–b8：镜头从正上方倾斜到 45°，等高线图变成一张平坦的三维网格面，准备进入下一段。

### s02-fold — 折叠

- 旁白（第 3 小节）："But many real problems don't."
- 画面：
  - b0–b3：平坦网格面从边缘开始向上卷起，逐渐包成一个球（网格点从平面坐标插值到球面坐标）。
  - b3–b5：球面上一点，沿原方向迈出一条直线步，线段离开球面，末端变红并定格。
  - b5–b7：球面与红色线段推远淡出，配乐上扬，切入画廊。

### s03-gallery — 真实应用

每个应用 4 小节，背景同一深色，主体居中偏左，标签在右下角。

1. b0–b4 机械臂（旁白第 1 小节："The orientation of a robot arm."）
   - 四节工业机械臂伸向空中的目标点；每个关节显示一个小坐标架并随关节转动；末端坐标架拖出姿态轨迹。
   - 标签："orientation ∈ SO(3)"。
2. b4–b8 无人机建图（旁白第 5 小节："The path of a drone that must close its loop."）
   - 俯视略倾斜视角：四旋翼沿回环航迹飞行，每隔一段留下一个小坐标架；漂移使轨迹逐渐偏离；回到起点附近出现一条闭环连线，整条轨迹平滑校正到闭合。
   - 标签："rotation averaging · SO(3)ⁿ"。
3. b8–b12 神经网络（旁白第 9 小节："The weights of a neural network, kept orthogonal."）
   - 分层网络节点与连线（左到右三四层），连线亮度随训练脉动；旁边一个权重矩阵画成 3–4 根列向量，训练中旋转但始终两两垂直（直角标记）；角落一条损失曲线下降。
   - 标签："orthonormal weights · Stiefel manifold"。
4. b12–b16 双曲嵌入（旁白第 13 小节："Hierarchies unfolding in hyperbolic space."）
   - 庞加莱圆盘内一棵层级树逐层展开，节点越深越靠近边界，节点间用正交于边界圆的圆弧相连。
   - 标签："hyperbolic embedding · Poincaré disk"。
5. b16–b20 扩散张量成像（旁白第 17 小节："Brain scans made of tiny ellipsoids."）
   - 真实 DTI 切片（素材见 player/public/trailer/）：脑轮廓内铺满椭球，颜色按主方向（红左右、绿前后、蓝上下），镜头缓慢推近，椭球沿纤维束排列。
   - 标签："diffusion tensors · SPD matrices"。
6. b20–b24 数据中的子空间（旁白第 21 小节："Subspaces hidden in data."）
   - 真实数据的三维点云（按类别着色），一个半透明平面转动去贴合点云，最终停在主方向上。
   - 标签："principal subspace · Grassmann manifold"。

### s04-toolkit — 重建工具箱

- 旁白（第 1 小节）："They all live on manifolds: spaces that curve as a whole, yet look flat up close."
- 旁白（第 7 小节）："To optimize there, every familiar idea must be rebuilt: direction, distance, gradient, step."
- 画面：
  - b0–b6：一张起伏的光滑曲面地形（若干山谷）缓慢旋转；镜头推近曲面上一点，周围一小块逐渐被一张切平面贴合（"look flat up close"）。
  - b7–b16：四个词依次出现在曲面上方，各自配一个视觉：
    - direction：切平面上几支切向量；
    - distance：切平面上的单位圆变形为椭圆（度量）；
    - gradient：一支梯度箭头指向下坡；
    - step：一步沿切向迈出后弯回曲面；随后一串迭代点沿曲面滑入谷底。

### s05-montage — 系列画面

- 旁白（第 1 小节）："This series builds that geometry from the ground up, with full proofs, and pictures that show why every assumption matters."
- 画面：飞入拼贴墙。开始时 8 个暗色占位框排成 4×2 网格；每小节一个镜头先在中央大框中出现，在框内缓慢推近（纹理缩放，不越出边框），半小节后缩小飞入自己的格子，当前格边框高亮；8 格拼满后整面墙淡出接标题。镜头取自已交付剧集（content/episodes/e00-trailer/montage.json）：
  - 被拉直的圆（隐函数）；
  - 压缩映射的蛛网迭代；
  - 球面上的坐标卡拼接；
  - 布满速度箭头的半球；
  - 转动的坐标架（SO(3)）；
  - 不同内积下的梯度方向；
  - retraction 把一步拉回球面；
  - 一张公式与证明账本的近景。

### s06-title — 标题

- 旁白（第 1 小节）："Riemannian Optimization, from the Ground Up."
- 画面：冲击音落下时，五度圈绕满一圈回到 C 点亮；系列标题；下方一行 "Full proofs · Animated counterexamples · English / Chinese captions"；最后一行小字 "New episodes follow the course."；余音中渐暗。不出现仓库或网页地址。

### s07-credits — 片尾署名

- 无旁白。标题完全淡出后，左对齐的浅色文字逐行淡入：数据与模型来源及许可（Stanford HARDI、Dry Bean、UR5e、Skydio X2，均为许可要求的署名）、制作工具、课程来源，最后一行"产品名称仅用于标识，不代表背书"。配乐为 C 大调长和弦弱奏收尾。

## Glossary additions

无。

## 估计时长

75 小节，约 2:30。
