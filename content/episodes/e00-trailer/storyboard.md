# E00 — Series Trailer

## 全集框架

- 核心问题：两分钟内让没看过系列的人明白：很多真实问题的参数不在平坦空间里，这个系列从头建立在弯曲空间上做优化所需的几何。
- 受众起点：知道"梯度下降"是什么；不要求任何流形知识。
- 主线：平坦世界 → 折叠成弯曲空间 → 六个真实应用 → 在弯曲地形上重建工具箱 → 系列画面蒙太奇 → 标题。
- 内容边界：只用一般性、公认的描述，不陈述具体定理，不列集数，不依赖当前已完成的剧集。应用场景的流形名称只作画面标签。
- 节拍：120 BPM，4/4，每小节 2 秒。旁白落在小节线上（下拍后 0.08 s）。段落长度以小节计，可按画面需要伸缩。
- 配乐：以正片配乐为基调（加法合成 pad、柔和拨弦作竖琴、FM 钟声、正弦贝斯，maj7 / min7 / add9 和声，和弦连贯交叠，四音签名动机），在其上加入弦乐、钢琴、圆号、定音鼓与轻打击乐。
- 调性：每个大段落一个调，转调前用 sus4 或属和弦铺垫：C（开场、折叠）→ G（画廊）→ D（工具箱）→ A（蒙太奇，以 ♭VI–♭VII 收尾）→ C（标题、片尾）。标题的五度圈动画象征整部系列（每集一个调），与配乐调性无逐一对应。
- 力度：一条连续的强度曲线，各声部按各自阈值逐渐加入；画廊的和声节奏随镜头加快。转折处是"呼吸"而非断开：画廊最后一小节收薄，镲片渐强接入工具箱的柔和低音；四个词各配一记钟声；定音鼓滚奏与镲片渐强引入蒙太奇和标题，标题落在完整的 C 和弦上，接钟声签名动机。

| 段落 | 小节 | 时长 | 配乐类别 |
|---|---|---|---|
| s01-flat | 8 | 16 s | trailer-open |
| s02-fold | 7 | 14 s | trailer-fold |
| s03-gallery | 24 | 48 s | trailer-gallery（6 个应用，6/5/4/3/3/3 小节） |
| s04-toolkit | 16 | 32 s | trailer-toolkit |
| s05-montage | 10 | 20 s | trailer-montage |
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

一条加速的弧线，而不是并列的清单。六个镜头长度依次为 6、5、4、3、3、3 小节；背景同一深色，标签在右下角。

- 切换：匹配剪辑。上一镜头推近它的关键元素，下一镜头从同一屏幕位置的对应元素拉出（zoom-through），切换落在小节线前一个八分音符，配乐在此处有一记高音钟声；切换瞬间在匹配点短暂描出下一个流形的轮廓线。
- 旁白：前两句完整，之后只说单词，句子越来越短，与加速配合；第一句在第 1 小节，其余落在各自镜头的第一小节（即切换处）。
- 结尾：最后一个镜头在段末 1.5 拍定格并淡出，配乐在最后一小节收薄，镲片渐强接入 s04。

1. b0–b6 机械臂（旁白第 1 小节："A robot arm, turning in space."）
   - 四节工业机械臂伸向空中的目标点；每个关节显示一个小坐标架并随关节转动；末端坐标架拖出姿态轨迹。匹配元素：末端坐标架。
   - 标签："orientation ∈ SO(3)"。
2. b6–b11 无人机建图（旁白第 6 小节："A drone, closing its loop."）
   - 四旋翼沿回环航迹飞行并留下坐标架；漂移后闭环校正。入点：机身坐标架；出点：闭合的回环。
   - 标签："rotation averaging · SO(3)ⁿ"。
3. b11–b15 神经网络（旁白第 11 小节："Network weights."）
   - 分层网络与正交列向量（直角标记），角落损失曲线下降。入点：网络中部；出点：正交列向量的公共原点。
   - 标签："orthonormal weights · Stiefel manifold"。
4. b15–b18 双曲嵌入（旁白第 15 小节："Hierarchies."）
   - 庞加莱圆盘内层级树逐层展开。入点：圆盘中心的根节点；出点：边界附近的叶节点。
   - 标签："hyperbolic embedding · Poincaré disk"。
5. b18–b21 扩散张量成像（旁白第 18 小节："Brain tissue."）
   - 真实 DTI 切片上的椭球场，镜头推近。入点：一个椭球；出点：脑切片中心。
   - 标签："diffusion tensors · SPD matrices"。
6. b21–b24 数据中的子空间（旁白第 21 小节："Patterns in data."）
   - 三维点云与转动贴合的平面。入点：点云中心；段末定格。
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
- 画面：飞入拼贴墙，12 格实时动画（各自渲染到离屏纹理），按课程顺序覆盖整门课的范围，左下角小标签。课程范围按教材式大纲估计：基础 → 一阶几何 → 联络与 Hessian → 测地线与移动 → 二阶算法。
  1. Open sets · convergence：开集内一点，收缩的开球与趋近的数列；
  2. Charts · transition maps：圆上两个重叠坐标卡，重叠区内一点同时有两个坐标；
  3. Inverse & implicit functions：F(x,y) = (x, x²+y²−1) 把圆拉直到横轴；
  4. Tangent spaces：经过 p 的曲线与其速度向量铺满切平面；
  5. Riemannian metrics：起伏曲面下的坐标平面上铺满度量单位球（沿 ∇h 压扁的椭圆），曲面上对应的是单位圆；
  6. Riemannian gradient · retraction：球面上沿 −grad f 迈一步再归一化拉回，迭代点下降到极小点；
  7. Connections · Riemannian Hessian：p 在球面上移动，切平面上画出二阶模型 ½⟨Hess f(p)[v], v⟩ 的等值椭圆与特征方向；
  8. Geodesics · exponential map：测地线从 p 向各方向射出，测地圆扩到赤道再在对跖点收拢（共轭点）；
  9. Parallel transport：向量沿测地三角形平行移动，回到起点时转了 90°（和乐）；
  10. Vector transport：黎曼共轭梯度中，上一步方向搬到新点并投影到新切平面，再与新梯度组合；
  11. Riemannian Newton：圆上的牛顿迭代几步到达极小点，梯度下降缓慢逼近；对数误差图对比二次与线性收敛；
  12. Trust regions：弯曲山谷上，每步在信赖圆盘内取 dogleg 步，接受则前进（圆盘可放大），拒绝则圆盘缩小。
  开始时 12 个暗色占位框排成 4×3 网格；前 6 格每小节两格快速飞入（先在中央大框一闪），后 6 格每格先在中央大框中播放一小节再飞入自己的位置并继续播放；最后一小节整面墙完整展示后淡出接标题。

### s06-title — 标题

- 旁白（第 1 小节）："Riemannian Optimization, from the Ground Up."
- 画面：冲击音落下时，五度圈绕满一圈回到 C 点亮；系列标题；下方一行 "Full proofs · Animated counterexamples · English / Chinese captions"；最后一行小字 "New episodes follow the course."；余音中渐暗。不出现仓库或网页地址。

### s07-credits — 片尾署名

- 无旁白。标题完全淡出后，左对齐的浅色文字逐行淡入：数据与模型来源及许可（Stanford HARDI、Dry Bean、UR5e、Skydio X2，均为许可要求的署名）、制作工具、课程来源，最后一行"产品名称仅用于标识，不代表背书"。配乐为 C 大调长和弦弱奏收尾。

## Glossary additions

无。

## 估计时长

77 小节，约 2:34。
