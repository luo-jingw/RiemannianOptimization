# E07 — Riemannian Gradient Descent

## 全集框架

- 核心问题：把 E06 的两个工具（黎曼梯度、retraction）组装成算法 x_{k+1} = R_{x_k}(−α_k grad f(x_k))，并回答：它停在什么点上（临界点）；要走多少步（在 Lipschitz 型条件下 O(1/√K)，与维数无关）；不知道常数 L 时步长怎么选（回溯线搜索）；在极小点附近多快（线性收敛，因子 1 − 1/κ）；梯度怎么推导、怎么检查。
- 来源：Boumal, *An Introduction to Optimization on Smooth Manifolds*（2023）第 4 章（`notes/07/IntroOptimManifolds_Boumal_2022.pdf` PDF 第 69–98 页），下文记作 BM，后接节号、定理号、公式号。标"补充"的例子与推导不在书中，均已数值核对。
- 受众起点：E01 的拓扑、邻域、收敛；E02 的光滑流形、Hausdorff（含两个原点的直线）；E03 的导数、链式法则、反函数定理、压缩映射；E05 的切空间；E06 的微分 df_x、Riesz 表示、黎曼度量与梯度、Cauchy–Schwarz、retraction 的定义与 γ(t) = R_x(tv) 满足 γ'(0) = v、球面归一化 retraction、下降性质。会求特征值，知道对称矩阵的特征值是实数、瑞利商的取值范围在 [λ_min, λ_max] 之间。不假定见过线搜索、收敛速率、Hessian、指数映射。
- 主线：一步变成一个算法 → 目标与收敛的语言 → 沿曲线的 Taylor 展开与拉回 → 临界点是能保证的目标 → RGD 与充分下降，裂项求和得到 1/√K → 充分下降从哪来：Lipschitz 型条件与步长区间 (0, 2/L) → 不知道 L：回溯线搜索 → 极小点附近：局部压缩映射与线性收敛 → 实际工作：推导梯度、数值检查梯度 → 回顾与后续工具。
- 贯穿例子：S² ⊂ ℝ³ 上的瑞利商 f(x) = ½ xᵀAx，A = diag(4, 2, 1)，retraction R_x(s) = (x + s)/‖x + s‖（BM 练习 4.11）。
  - 欧氏梯度 Ax，黎曼梯度 grad f(x) = (I − xxᵀ)Ax = Ax − (xᵀAx)x（E06 的投影公式）。
  - 临界点 ±e₁（极大，f = 2）、±e₂（鞍点，f = 1）、±e₃（极小，f = ½）；f_low = ½。
  - 在 e₃ 处 Hessian 的特征值为 2 − 1 = 1 与 4 − 1 = 3，κ = 3。
  - A4.3 在整个切丛上成立，L = λ_max − λ_min = 3（补充推导，c05）；步长 1/L = 1/3 时局部收敛比值实测 0.6667 = 1 − 1/κ。
- 内容依赖：

| content_id | 内容 | 前置 | 建立位置 |
|---|---|---|---|
| neighborhood-convergence | 邻域、序列收敛 | — | E01 |
| hausdorff | Hausdorff 性质；两个原点的直线 | neighborhood-convergence | E02 |
| chain-rule | D(F∘G) = DF·DG | — | E03 |
| inverse-function-theorem | DF(x) 可逆 ⇒ 局部微分同胚 | chain-rule | E03 |
| contraction-mapping | 压缩映射有唯一不动点，迭代收敛 | — | E03 |
| tangent-space | T_xM；球面 T_xS² = x^⊥ | — | E05 |
| riemannian-gradient | ⟨grad f(x), v⟩_x = Df(x)[v]；子流形上为欧氏梯度的投影 | riesz、riemannian-metric | E06 |
| retraction | R_x(0) = x，DR_x(0) = id；γ(t) = R_x(tv) ⇒ γ'(0) = v；球面归一化 | tangent-space | E06 |
| cauchy-schwarz | \|⟨u,v⟩\| ≤ ‖u‖‖v‖ | inner-product | E06 |
| minimizer | 全局 / 局部 / 严格局部极小 | neighborhood-convergence | c01 |
| accumulation-point | 子列的极限；极限蕴含所有聚点相等 | neighborhood-convergence、hausdorff | c01 |
| taylor-on-curves | f(c(t)) = f(x) + t⟨grad f(x), v⟩ + O(t²) | chain-rule、riemannian-gradient | c02 |
| pullback | f∘R_x：T_xM 上的函数，在 0 处梯度为 grad f(x) | taylor-on-curves、retraction | c02 |
| critical-point | (f∘c)'(0) ≥ 0 对所有曲线 ⇔ grad f(x) = 0 | taylor-on-curves | c03 |
| rgd | 算法 4.1；线搜索 | retraction、riemannian-gradient | c04 |
| sufficient-decrease | A4.1、A4.2 ⇒ ‖grad‖ → 0，min ‖grad‖ ≤ C/√K | rgd、critical-point、accumulation-point | c04 |
| lipschitz-type | A4.3；步长 (0, 2/L) ⇒ A4.2；步长 1/L ⇒ K ≥ 2L(f₀ − f_low)/ε² | pullback、sufficient-decrease、cauchy-schwarz | c05 |
| backtracking | Armijo 条件；回溯返回 α ≥ min(ᾱ, 2τ(1 − r)/L) | lipschitz-type | c06 |
| convergence-rate | 线性 / 超线性 / 二次收敛 | neighborhood-convergence | c07 |
| hessian-preview | 临界点处 Hess f(x*)：自伴；f(R_x*(v)) = f(x*) + ½⟨v, Hess v⟩ + O(‖v‖³)；梯度场在 x* 的导数等于 Hess | pullback | c07（预告，正式定义在后续集） |
| local-contraction | ‖DF(x*)‖ < 1 ⇒ 局部线性收敛，因子 ≤ ‖DF(x*)‖ | inverse-function-theorem、retraction、convergence-rate | c07 |
| rgd-local-rate | Hess ≻ 0、L > λ_max/2 ⇒ 局部线性；L = λ_max 时因子 ≤ 1 − 1/κ | local-contraction、hessian-preview | c07 |
| gradient-recipe | Df(x)[v] → 伴随 → ⟨g, v⟩ ⇒ grad f = g | riemannian-gradient | c08 |
| gradient-check | E(t) = O(t²)，log–log 斜率 2；切向检查 | taylor-on-curves | c09 |

- 本集使用的术语：critical-point、riemannian-gradient、retraction、tangent-space、riemannian-metric、cauchy-schwarz、chain-rule、inverse-function-theorem、contraction、fixed-point、hausdorff、line-with-two-origins、convergence、neighborhood、operator-norm、symmetric-matrix、descent-property、local-diffeomorphism；新增术语见文末 Glossary additions。

### 全集画面约定

- 主舞台：Three.js 中的单位球 S²，颜色图显示瑞利商 f(x) = ½xᵀAx（冷色低、暖色高），等值线细白；六个临界点用小圆点标出（±e₃ 绿色，±e₂ 紫色，±e₁ 暖色）。e₃ 朝上，相机默认从斜上方看北半球。
- 切平面 T_xM：半透明正方形；切向量青色；−grad 白色粗箭头；retraction 曲线白色细线。
- 迭代：橙色点为当前迭代，橙色细线连接历史迭代；被拒绝的试探点为空心红点。
- 曲线面板（MiniPlot，左下或右侧）：1D 函数 g(t) = f(R_x(−t grad f(x))) 或一维反例 f(x)；Armijo 直线琥珀色；二次上界紫色虚线。
- 对数面板：纵轴 log，迭代次数或 t 为横轴；参考斜率线为灰色虚线。
- 证明账本（ledger）：右侧 x ≥ 1400，最多 4 行；每章开头清空并写入本章前置事实（标注来源）。
- 公式区：顶部 y ≈ 100 一行陈述；底部 y ≈ 800 推导行。字幕区 y ≥ 860 不放图形。
- 配色：已建立的事实绿色；反例、违反假设的对象红色；第二个对象（第二个函数、第二种度量）紫色；强调公式黄色。

## 章节

### c01-problem-and-sequences — 从一步到一个算法：目标与收敛的语言

- question：观众能写出问题 min_{x∈M} f(x)，区分全局、局部、严格局部极小；能区分序列的极限与聚点，并说出为什么"极限在 E 中存在"不等于"在 M 中收敛"。
- requires：neighborhood-convergence（E01）、hausdorff、line-with-two-origins（E02）、retraction、descent-property（E06）。
- music：motivation
- teaching_sequence：
  - 直觉：E06 结束时我们会走一步：x ↦ R_x(−t grad f(x))，且小步一定下降。重复这一步就是算法。要分析算法，先要说清目标是什么、"收敛"是什么意思。
  - 定义（BM 章首）：全局极小 x：f(x) ≤ f(y) 对所有 y ∈ M；局部极小：对 x 的某个邻域中的 y 成立；严格局部极小：y ≠ x 时严格小于。三者都只用到集合、函数和拓扑（邻域），与光滑结构无关；光滑结构、度量、retraction 是我们为求解而选的工具（BM："the Riemannian geometry we impose on the problem is entirely ours to choose"）。
  - 例子：
    - 不存在：ℝ 上 f(x) = eˣ，inf = 0 取不到。
    - 不唯一：瑞利商在 S² 上有两个全局极小 ±e₃（f(−x) = f(x)）。
    - 局部非全局：圆 S¹ 上 f(θ) = cos θ + 0.6 cos 2θ 的两个谷（补充），一个是全局极小，一个只是局部极小。
  - 定义 4.1：x 是序列的极限：x 的每个邻域 U 都包含序列从某项起的全部项；x 是聚点：它是某个子列的极限，等价于 x 的每个邻域包含序列的无穷多项。
  - 例子（BM 练习 4.2）：xₖ = k 无极限无聚点；xₖ = 0（k 偶）、k（k 奇）有唯一聚点 0 但无极限；xₖ = (−1)ᵏ 有两个聚点。
  - 边界：
    - M = (0, 1) ⊂ ℝ，xₖ = 1/(k + 1) 在 ℝ 中收敛到 0，但 0 ∉ M，所以在 M 中无极限；若 M 在 E 中是闭集，这种情况不会发生（BM 练习 4.2）。
    - Hausdorff 保证极限唯一（BM 定义 4.1 中的注）。
  - 用途：c04 的结论正是关于聚点的；c07 才处理收敛本身。
- proof_steps（命题：若 xₖ → x，则每个聚点都等于 x；BM 练习 4.2）：
  1. 设 y 是聚点：存在子列 x_{k_j} → y。
  2. 收敛序列的任意子列收敛到同一极限：x 的每个邻域包含从某项 K 起的全部 xₖ，而 k_j → ∞，所以也包含从某个 j 起的全部 x_{k_j}；于是 x_{k_j} → x。
  3. 子列 x_{k_j} 同时收敛到 x 与 y；M 是 Hausdorff 的，极限唯一，所以 y = x。
- necessity：
  - 去掉 Hausdorff：两个原点的直线（E02）中，序列 1/k 同时收敛到两个原点 0_a 与 0_b，"极限"不唯一，第 3 步失效。动画：两个原点各自的小邻域，序列尾部同时落入两者。
- visual_events：
  - e1｜"Last time we learned to take one step"｜S² 颜色图（瑞利商），点 x，白色 −grad 箭头与 retraction 曲线｜点沿 R_x(−t grad) 走一步，f 读数下降｜球保留｜落点为橙点
  - e2｜"Repeat it and you have an algorithm"｜迭代点序列 x₀, x₁, x₂, … 以橙线相连，逐步走向 e₃｜每拍一个新点｜—｜停在 e₃ 附近；顶部公式 x_{k+1} = R_{x_k}(−α_k grad f(x_k))
  - e3｜"Global, local, strict"｜S¹ 上的函数 f(θ)（展开为平面曲线），两个谷｜全局极小绿点，局部极小黄点，各画一个邻域括号｜—｜标注 global / local
  - e4｜"Minimizers may not exist, or not be unique"｜左：eˣ 曲线趋向 0 的渐近线；右：S² 上 ±e₃ 同时标绿｜—｜—｜—
  - e5｜"Only topology is needed to state the problem"｜ledger 写入：problem depends on topology only；geometry (metric, retraction) is our choice｜—｜—｜—
  - e6｜"Limit versus accumulation point"｜数轴：xₖ = (−1)ᵏ 在 ±1 间跳；两个邻域各收到无穷多点｜点逐个落下，邻域计数增加｜—｜标注 two accumulation points, no limit
  - e7｜"A limit outside the manifold"｜区间 (0,1) 用空心端点；序列 1/(k+1) 挤向 0｜0 处空心圈闪红｜—｜标注 limit in ℝ, not in M
  - e8｜"Convergence forces a single accumulation point"｜三步证明在公式区逐行出现｜每行出现时对应数轴高亮｜—｜ledger：xₖ → x ⇒ every accumulation point = x
  - e9｜"Without Hausdorff it breaks"｜两个原点的直线，序列 1/k 同时落入两个原点的邻域｜两个邻域交替闪烁｜—｜标注 two limits
- outcome_check：给出 (−1)ᵏ 与 1/(k+1) ⊂ (0,1) 两个序列，观众能分别说出聚点和极限的情况。
- source：BM 第 4 章章首（(4.1)，minimizer 定义）、定义 4.1、练习 4.2。S¹ 函数与两个原点的直线为补充。
- next：分析迭代需要知道 f 沿一条曲线怎样变化：Taylor 展开。

### c02-taylor-on-curves — 沿曲线的一阶 Taylor 展开与拉回

- question：观众能写出 f(c(t)) = f(x) + t⟨grad f(x), v⟩_x + O(t²)，能说出 retraction 版本，并解释拉回 f∘R_x 是切空间上的普通函数、它在 0 处的梯度就是 grad f(x)。
- requires：chain-rule（E03）、riemannian-gradient、retraction（E06）。
- music：definition
- teaching_sequence：
  - 直觉：迭代沿曲线移动；只要知道 f 沿曲线的变化，就能分析每一步。沿曲线 f 变成一元函数，可以用普通的 Taylor 展开。
  - 定义（BM 4.1）：c: I → M 光滑，c(0) = x，c'(0) = v；g(t) = f(c(t))。g(t) = g(0) + t g'(0) + O(t²)；链式法则 g'(t) = Df(c(t))[c'(t)] = ⟨grad f(c(t)), c'(t)⟩_{c(t)}，所以 f(c(t)) = f(x) + t⟨grad f(x), v⟩_x + O(t²)（4.2）。
  - retraction 曲线 c(t) = R_x(tv) 满足 c'(0) = v（E06），得（4.3）；令 s = tv 得（4.4）：f(R_x(s)) = f(x) + ⟨grad f(x), s⟩_x + O(‖s‖²_x)。
  - 拉回：f∘R_x: T_xM → ℝ 是线性空间上的光滑函数，"把代价函数从流形拉回到切空间"。
  - 例子：瑞利商，x 在北半球，v = −grad f(x)。曲线面板画 g(t) 与切线 f(x) + t⟨grad, v⟩；放大 t → 0 处，两者之差除以 t² 的比值保持有界。拉回：切平面上的颜色图 f(R_x(s))，与球面颜色"同一组值"。
  - 中值形式（BM 练习 4.3）：c: [0,1] → M，存在 t ∈ (0,1) 使 f(y) = f(x) + ⟨grad f(c(t)), c'(t)⟩_{c(t)}（4.5）。
  - 边界：O(t²) 中的常数依赖于 x 与方向；c05 将要求它一致有界。
  - 用途：c03 的临界点、c04–c06 的每一步估计、c09 的梯度检查都基于（4.3）/（4.4）。
- proof_steps：
  1. （4.4）的梯度形式：D(f∘R_x)(0)[s] = Df(R_x(0))[DR_x(0)[s]] = Df(x)[s] = ⟨grad f(x), s⟩_x（链式法则，R_x(0) = x，DR_x(0) = id），所以 f∘R_x 在 0 处的梯度是 grad f(x)。
  2. g = f∘c 是光滑一元函数，Taylor 定理给出 g(t) = g(0) + t g'(0) + O(t²)；代入 g'(0) 得（4.2）。
  3. 练习 4.3：g 在 [0,1] 上可微，由一元中值定理，存在 t 使 g(1) − g(0) = g'(t)，即（4.5）。
- necessity：
  - 曲线速度必须是 v：E06 中"速度加倍"的映射 R̃_x(v) = (x + 2v)/‖x + 2v‖ 满足 R̃_x(0) = x，但曲线面板中 g(t) 的初始斜率是 2⟨grad, v⟩，与预测直线错开一个因子 2。动画：两条曲线从同一点出发，斜率读数 −‖grad‖² 与 −2‖grad‖²。
- visual_events：
  - e1｜"Along a curve, f becomes a function of one variable"｜S²，x，过 x 的曲线 c(t)，右侧曲线面板 g(t)｜点沿曲线移动，面板中对应点同步｜—｜面板保留
  - e2｜"Chain rule gives the slope"｜公式区：g'(0) = Df(x)[v] = ⟨grad f(x), v⟩｜切线在面板中画出｜—｜(4.2) 进 ledger
  - e3｜"Use a retraction curve"｜c(t) 换成 R_x(tv)，v = −grad｜曲线换色为白色｜面板保留｜(4.3)
  - e4｜"The gap is order t squared"｜面板放大 t 接近 0；附小读数 (g(t) − line)/t²｜放大动画，读数稳定｜—｜标注 O(t²)
  - e5｜"The pullback lives on the tangent plane"｜切平面染上 f(R_x(s)) 的颜色；细线连接切平面点 s 与球面点 R_x(s)｜颜色从球面"流"到平面｜球保留｜(4.4)，标注 pullback f∘R_x
  - e6｜"Its gradient at zero is grad f"｜推导三步（链式法则、R_x(0)=x、DR_x(0)=id）｜每步上方标依据｜—｜ledger：grad(f∘R_x)(0) = grad f(x)
  - e7｜"Wrong speed, wrong slope"｜面板中加紫色 g̃(t)，来自速度加倍的映射｜两条初始斜率读数并列｜—｜标注 slope ×2
  - e8｜"A mean value form"｜c: [0,1] → M 连接 x、y；面板上画割线与平行切线｜—｜—｜(4.5)
- outcome_check：观众能说出 f(R_x(s)) 的一阶项是什么，以及为什么 retraction 的条件 DR_x(0) = id 是这个展开成立的原因。
- source：BM §4.1，(4.2)–(4.5)，练习 4.3。拉回梯度的推导为 (4.4) 的直接改写；速度加倍反例沿用 E06。
- next：一阶项为零的点有什么意义？这就是临界点。

### c03-critical-points — 临界点：算法能保证的目标

- question：观众能用曲线定义临界点，证明局部极小是临界点、临界点等价于 grad f(x) = 0，并能举出临界但不是极小的点。
- requires：taylor-on-curves（c02）、riemannian-gradient（E06）。
- music：proof
- teaching_sequence：
  - 直觉：在局部极小点，沿任何方向出发都不能"以线性速率"下降。
  - 定义 4.4：x 是临界点（驻点）⇔ 对所有过 x 的光滑曲线 c 有 (f∘c)'(0) ≥ 0。同时考虑 c(t) 与 c(−t) 得等价形式 (f∘c)'(0) = 0；再由链式法则等价于 Df(x) = 0。
  - 例子：瑞利商的梯度场画在球面上（切向箭头），六个零点：±e₃ 极小，±e₂ 鞍点，±e₁ 极大；grad f(x) = Ax − (xᵀAx)x = 0 ⇔ Ax = (xᵀAx)x ⇔ x 是 A 的单位特征向量。
  - 边界：逆命题不成立：±e₂、±e₁ 是临界点但不是极小。临界点集合与度量无关（Df(x) = 0 不涉及内积），而梯度方向依赖度量（E06 c05）。
  - 用途：c04 起，算法的保证都是"聚点是临界点"，也就是"梯度变小"。
- proof_steps：
  - 命题 4.5（局部极小 ⇒ 临界）：
    1. 设 x 是局部极小：存在邻域 U，f(y) ≥ f(x) 对 y ∈ U。反设存在光滑曲线 c，c(0) = x，(f∘c)'(0) < 0。
    2. (f∘c)' 连续，存在 δ > 0 使 (f∘c)'(τ) < 0 对 τ ∈ [0, δ]。
    3. 对 t ∈ (0, δ]：f(c(t)) = f(x) + ∫₀ᵗ (f∘c)'(τ) dτ < f(x)。
    4. c 连续，c⁻¹(U) 是 I 中含 0 的开集，所以存在 t ∈ (0, δ] 使 c(t) ∈ U，从而 f(c(t)) ≥ f(x)，矛盾。
  - 命题 4.6（临界 ⇔ grad f(x) = 0）：
    1. 对任意曲线 (f∘c)'(0) = Df(x)[v] = ⟨grad f(x), v⟩_x，v = c'(0)。
    2. grad f(x) = 0 ⇒ 上式为 0 ⇒ x 临界。
    3. x 临界 ⇒ ⟨grad f(x), v⟩ ≥ 0 对所有 v ∈ T_xM（每个切向量都是某条曲线的速度，E05）；用 −v 得 ≤ 0，所以 ⟨grad f(x), v⟩ = 0 对所有 v；取 v = grad f(x) 得 ‖grad f(x)‖² = 0。
- necessity：
  - 命题 4.5 需要 f 光滑（至少 f∘c 连续可微）：ℝ 上 f(x) = |x| 在 0 处是全局极小，但 f∘c 在 0 处不可微，"临界"无从定义。动画：V 形曲线，两侧斜率 −1 与 +1，0 处无切线。
  - 命题 4.5 的结论不能反过来：瑞利商在 e₂ 处 grad = 0，但沿 e₁ 方向 f 增大、沿 e₃ 方向 f 减小（鞍点）；ℝ 上 x³ 在 0 处临界但不是极值（补充）。
  - 命题 4.6 需要内积（度量）才谈得上梯度；换一个度量梯度方向变化，但零点不变（补充，承接 E06 c05）。动画：同一点处两个度量下的梯度箭头方向不同；在 e₃ 处两者都缩为零。
- visual_events：
  - e1｜"At a minimizer, no curve goes down at a linear rate"｜S² 上 e₃ 与若干过 e₃ 的曲线；曲线面板中 f∘c 在 0 处斜率为 0｜—｜—｜定义 4.4 进顶部
  - e2｜"Proof by contradiction"｜面板：假设斜率为负，(0, δ] 上 f∘c 低于 f(x)；邻域 U 的区间 c⁻¹(U) 与 (0, δ] 相交处闪红｜四步逐行｜—｜ledger：local min ⇒ critical
  - e3｜"Critical means zero gradient"｜公式三行；箭头 v 与 −v 在切平面上对称｜—｜—｜ledger：critical ⇔ grad f = 0
  - e4｜"The gradient field of the Rayleigh quotient"｜球面上的切向梯度箭头场；六个零点标色｜相机绕球一周｜—｜标注 eigenvectors
  - e5｜"Critical is not minimal"｜e₂ 处放大：沿 e₁ 方向的曲线上升（暖色），沿 e₃ 方向下降（冷色）｜—｜—｜标注 saddle
  - e6｜"No derivative, no criticality"｜|x| 的 V 形，两侧斜率读数｜—｜—｜—
  - e7｜"Critical points do not depend on the metric"｜某点处两个度量下的两支梯度箭头（白、紫）；点移到 e₃ 时两支同时缩为零｜—｜—｜—
- outcome_check：观众能解释为什么瑞利商的临界点恰好是 A 的单位特征向量，并指出其中哪些是极小。
- source：BM §4.2，定义 4.4，命题 4.5、4.6。瑞利商临界点、|x|、x³、度量无关性为补充。
- next：算法的目标确定为"梯度趋于零"。下面看 RGD 怎样做到。

### c04-rgd-and-sufficient-decrease — RGD 与充分下降：梯度为什么趋于零

- question：观众能写出 RGD，说出三种步长策略，能用裂项求和证明在 A4.1、A4.2 下 ‖grad f(x_k)‖ → 0 且 min_{k<K} ‖grad f(x_k)‖ ≤ √((f(x₀) − f_low)/c)/√K，并说出这个结论没有断言什么。
- requires：rgd 的两个零件（E06）、critical-point（c03）、accumulation-point（c01）。
- music：proof
- teaching_sequence：
  - 直觉：每步至少下降一定量，而 f 不能无限下降，所以下降量必须越来越小；下降量与梯度平方成正比，于是梯度变小。
  - 定义（BM 算法 4.1）：给定 x₀ 与 retraction R，x_{k+1} = R_{x_k}(s_k)，s_k = −α_k grad f(x_k)。retraction 是算法规格的一部分。线搜索函数 g(t) = f(R_{x_k}(−t grad f(x_k)))（4.6）。三种步长：固定；精确极小化 g；回溯（c06）。
  - 假设：A4.1 存在 f_low 使 f(x) ≥ f_low；A4.2 充分下降 f(x_k) − f(x_{k+1}) ≥ c‖grad f(x_k)‖²（4.7）。A4.2 由线搜索负责，c05、c06 给出条件。
  - 例子：瑞利商，固定步长 α = 1/3，从北半球一点出发；对数面板画 min_{j≤k} ‖grad f(x_j)‖ 与界 C/√(k+1)，实际曲线远低于界并呈直线下降（预告 c07）。
  - 边界：结论只说聚点（如果有）是临界点；不说迭代收敛，不说收敛到极小（BM："gradient descent converges to critical points"，复数）；对 x₀ 没有要求。
  - 用途：c05、c06 只需要验证 A4.2。
- proof_steps（命题 4.7）：
  1. 裂项：f(x₀) − f_low ≥ f(x₀) − f(x_K)（A4.1）= Σ_{k=0}^{K−1} (f(x_k) − f(x_{k+1})) ≥ Σ c‖grad f(x_k)‖²（A4.2）≥ K c min_{k<K} ‖grad f(x_k)‖²。
  2. 开方得 min_{k<K} ‖grad f(x_k)‖ ≤ √((f(x₀) − f_low)/c) · 1/√K。
  3. A4.2 ⇒ f(x_{k+1}) ≤ f(x_k)；令 K → ∞，非负级数 Σ (f(x_k) − f(x_{k+1})) ≤ f(x₀) − f_low 收敛，所以通项 → 0，于是 c‖grad f(x_k)‖² → 0。
  4. 设 x 是聚点，子列 x_{k_j} → x。‖grad f(·)‖ 连续（f 光滑），所以 ‖grad f(x)‖ = lim ‖grad f(x_{k_j})‖ = 0，x 是临界点（c03）。
- necessity：
  - 去掉 A4.1：ℝ 上 f(x) = −x，grad = −1，α = 1 时每步下降 1 = 1·‖grad‖²，A4.2 成立（c = 1），但 ‖grad‖ ≡ 1，f → −∞。动画：点沿直线一直向右走，f 读数无界下降，梯度读数始终为 1。
  - 去掉 A4.2（步长太小）：ℝ 上 f(x) = ½x²，x₀ = 1，α_k = 1/(k+2)²：x_{k+1} = (1 − α_k)x_k，x_k → ∏_{n≥2}(1 − 1/n²) = ½，梯度停在 ½ ≠ 0。下降量 ≈ α_k x_k² 可求和，不存在常数 c（补充，数值核对 0.500002）。动画：点越走越慢，停在 ½，绿色"临界点"0 永远够不到。
  - 结论只关于聚点：f(x) = e^{−x}（f_low = 0），α = 1：x_{k+1} = x_k + e^{−x_k} → ∞，‖grad‖ → 0，A4.2 成立（c = 1 − 1/e），但没有聚点、没有临界点（补充，数值核对 c = 0.6321）。动画：点向右漂移，梯度读数趋于 0，画面中找不到停靠点。
- visual_events：
  - e1｜"The algorithm"｜算法 4.1 的伪代码框｜—｜—｜顶部公式保留
  - e2｜"The line-search function"｜S²，x_k，−grad；曲线面板画 g(t)｜沿 t 的点在球面与面板上同步｜—｜三种策略标签：fixed / exact / backtracking
  - e3｜"Two assumptions"｜ledger 写入 A4.1、A4.2｜—｜—｜—
  - e4｜"A telescoping sum"｜一列竖条：每条高度为 f(x_k) − f(x_{k+1})，叠起来不超过总高度 f(x₀) − f_low；每条下方标 ≥ c‖grad f(x_k)‖²｜条形逐个叠加｜—｜推导行 (步 1–2)
  - e5｜"Gradients must shrink"｜竖条高度越来越小；对数面板 min ‖grad‖ 与 C/√K｜—｜—｜ledger：‖grad f(x_k)‖ → 0；min ≤ C/√K
  - e6｜"Accumulation points are critical"｜子列点向某点汇聚，‖grad‖ 连续性标注｜—｜—｜步 4
  - e7｜"What it does not say"｜三个灰色标签：converges? to a minimizer? from any start only to critical points｜前两个打叉｜—｜—
  - e8｜"Unbounded below"｜f(x) = −x，点右移，读数｜—｜—｜红色标注 A4.1 fails
  - e9｜"Steps too small"｜f = ½x²，点停在 ½；读数 ∏(1 − 1/n²) = ½｜—｜—｜红色标注 A4.2 fails
  - e10｜"Small gradients, no limit"｜f = e^{−x}，点漂向右侧，‖grad‖ 读数 → 0｜—｜—｜标注 no accumulation point
- outcome_check：观众能说出命题 4.7 的两个假设各自在证明哪一步使用，以及 e^{−x} 例子说明了结论的哪条边界。
- source：BM §4.3，算法 4.1，(4.6)、(4.7)，A4.1、A4.2，命题 4.7 及其后的说明。三个一维反例为补充，均数值核对。
- next：A4.2 从哪来？需要控制 Taylor 展开的二阶余项。

### c05-lipschitz-type-condition — Lipschitz 型条件：步长区间与 1/√K 的复杂度

- question：观众能写出 A4.3，证明步长在 (0, 2/L) 内保证充分下降，写出步长 1/L 时的迭代复杂度 K ≥ 2L(f(x₀) − f_low)/ε²，并解释 A4.3 为什么写成拉回的二次上界而不是"梯度 Lipschitz"。
- requires：pullback（c02）、sufficient-decrease（c04）、cauchy-schwarz（E06）。
- music：proof
- teaching_sequence：
  - 直觉：f(x_{k+1}) = f(x_k) + ⟨grad, s_k⟩ + O(‖s_k‖²)。如果余项被统一的二次式控制，就能从一阶下降中减去二阶损失，得到净下降。
  - 定义（A4.3）：对子集 S ⊆ TM，存在 L > 0，使 (x, s) ∈ S 时 f(R_x(s)) ≤ f(x) + ⟨grad f(x), s⟩ + (L/2)‖s‖²（4.8）。几何：拉回 f∘R_x 位于一个开口向上的抛物面之下。
  - 欧氏动机：E 中 R_x(s) = x + s；若梯度 L-Lipschitz（4.10），则（4.9）成立（下方证明）。流形上推广（4.10）要比较 grad f(x) ∈ T_xM 与 grad f(y) ∈ T_yM，它们在不同的切空间里，不能直接相减（BM 10.3–10.5 节处理）；推广二次上界（4.11）只需选定 retraction，于是得到 A4.3。下水平集紧时 BM 引理 10.57 可用来验证 A4.3。
  - 例子（BM 练习 4.11，补充解答）：瑞利商与归一化 retraction 在整个切丛上满足 A4.3，L = λ_max − λ_min = 3。数值上 sup 2(f(R_x(s)) − f(x) − ⟨grad, s⟩)/‖s‖² ≈ 2.9992。
  - 边界：L 是全局常数，可能因个别区域而很大，迫使所有步都很小（引出 c06）。
  - 用途：c06 的回溯在不知道 L 时达到同样的保证；c07 引理 4.22 把 L 与 Hessian 联系起来。
- proof_steps：
  - 命题 4.8：
    1. 由 A4.3，f(x_{k+1}) ≤ f(x_k) + ⟨grad f(x_k), s_k⟩ + (L/2)‖s_k‖²。
    2. 代入 s_k = −α_k grad f(x_k)：f(x_k) − f(x_{k+1}) ≥ (α_k − (L/2)α_k²)‖grad f(x_k)‖²。
    3. 系数是 α 的二次函数，根为 0 与 2/L，在 (0, 2/L) 上为正、在 1/L 处取最大 1/(2L)；在 [α_min, α_max] 上的最小值在端点，c = min(α_min − (L/2)α_min², α_max − (L/2)α_max²) > 0。
  - 推论 4.9：把 c = 1/(2L) 代入命题 4.7：min_{k<K} ‖grad f(x_k)‖ ≤ √(2L(f(x₀) − f_low))/√K；等价地，K ≥ 2L(f(x₀) − f_low)/ε² 步内必有一个 ‖grad‖ ≤ ε。式中没有维数。
  - （4.10）⇒（4.11）：c(t) = x + ts；f(x + s) − f(x) = ∫₀¹ ⟨grad f(x + ts), s⟩ dt；减去 ⟨grad f(x), s⟩，Cauchy–Schwarz 与 Lipschitz 给出 |f(x + s) − f(x) − ⟨grad f(x), s⟩| ≤ ∫₀¹ L t‖s‖² dt = (L/2)‖s‖²。
  - 练习 4.11（补充解答，L = λ_max − λ_min）：
    1. s ⊥ x，所以 ‖x + s‖² = 1 + ‖s‖²，f(R_x(s)) = ½(x + s)ᵀA(x + s)/(1 + ‖s‖²)；⟨grad f(x), s⟩ = xᵀAs。
    2. 记 s = ρu，‖u‖ = 1，u ⊥ x；a = xᵀAx，b = xᵀAu，c = uᵀAu。整理得 f(R_x(s)) − f(x) − ⟨grad, s⟩ = ρ²(½(c − a) − ρb)/(1 + ρ²)。
    3. 2×2 矩阵 [[a, b], [b, c]] 是 A 在 span{x, u} 上的压缩，特征值在 [λ_min, λ_max] 中，所以 ((c − a)/2)² + b² ≤ (Δ/2)²，Δ = λ_max − λ_min。
    4. 令 δ = (c − a)/2：½(c − a) − ρb ≤ δ + ρ√((Δ/2)² − δ²) ≤ (Δ/2)√(1 + ρ²) ≤ (Δ/2)(1 + ρ²)。
    5. 于是差 ≤ (Δ/2)ρ² = (L/2)‖s‖²，L = Δ。
- necessity：
  - 步长不在 (0, 2/L)：ℝ 上 f(x) = (L/2)x²，x_{k+1} = (1 − αL)x_k。α = 1/L 一步到 0；α = 2/L 时在 ±x₀ 之间来回跳，f 不变；α > 2/L 时发散（补充）。动画：三条迭代并排，步长滑块越过 2/L 时迭代变红并飞出。
  - A4.3 没有全局 L：ℝ 上 f(x) = x⁴，固定步长 α：当 |x₀| > 1/√(2α) 时 |x₁| = |x₀||1 − 4αx₀²| > |x₀|，迭代发散（补充）。在 S = {|x| ≤ 1} 上 L = 12 有效，但迭代离开 S 后保证失效，对应命题 4.8 中"(x_k, s_k) 都在 S 中"的要求。
- visual_events：
  - e1｜"Control the remainder"｜曲线面板 g(t) 与切线；二次上界（紫色虚线抛物线）从上方包住 g｜抛物线开口随 L 收紧｜—｜(4.8)
  - e2｜"Net decrease is a parabola in alpha"｜新面板：α − (L/2)α² 的抛物线，根 0 与 2/L，顶点 1/L｜点沿 α 轴移动，读数显示系数｜—｜ledger：α ∈ (0, 2/L) ⇒ A4.2
  - e3｜"Iteration complexity"｜推论 4.9 的公式；K 与 ε 的关系曲线 K ∝ 1/ε²｜—｜—｜ledger：K ≥ 2L(f₀ − f_low)/ε²；标注 dimension-free
  - e4｜"Euclidean origin"｜线段 x + ts，积分推导三行｜—｜—｜(4.10) ⇒ (4.11)
  - e5｜"Gradients at two points live in different planes"｜S² 上两点 x、y 与各自的切平面、各自的梯度箭头｜两个箭头尝试相减时标红｜—｜标注 cannot subtract
  - e6｜"The Rayleigh quotient satisfies it with L = 3"｜五步推导；右侧 2×2 压缩矩阵与特征值区间 [λ_min, λ_max]｜—｜—｜读数 empirical sup ≈ 2.999
  - e7｜"Step sizes outside the interval"｜三列：α = 1/L、2/L、2.2/L 的迭代｜第二列来回跳，第三列发散｜—｜—
  - e8｜"No global L"｜x⁴ 曲线，迭代从 |x₀| = 1.2 出发越跳越远｜—｜—｜标注 leaves S
- outcome_check：观众能回答：已知 L 时最安全的固定步长是多少，为什么；步长 2/L 在二次函数上会发生什么。
- source：BM §4.4，A4.3，命题 4.8，推论 4.9，(4.9)–(4.11)，定义 4.10，练习 4.11。练习解答与一维反例为补充，均数值核对。
- next：L 通常不知道，或只在局部很大。能否自适应地选步长？

### c06-backtracking — 回溯线搜索：不知道 L 也能保证下降

- question：观众能写出 Armijo 条件与回溯算法，证明在 A4.3 下回溯返回的步长 α ≥ min(ᾱ, 2τ(1 − r)/L)、试探次数有对数上界，并说出初始步长怎样选能对 f 的缩放保持不变。
- requires：lipschitz-type（c05）、sufficient-decrease（c04）。
- music：proof
- teaching_sequence：
  - 直觉：先试一个较大的步长，不够好就缩短，直到下降量"与步长相称"。
  - 定义（BM 算法 4.2）：参数 τ, r ∈ (0, 1)（常取 τ = ½，r = 10⁻⁴）；α ← ᾱ；当 f(x) − f(R_x(−α grad f(x))) < rα‖grad f(x)‖² 时 α ← τα；输出 α。条件（4.12）称为 Armijo–Goldstein 条件。
  - 例子：瑞利商，x 在北半球。曲线面板画 g(α) = f(R_x(−α grad))、Armijo 直线 f(x) − rα‖grad‖²（演示取 r = 0.3，旁白说明常用值 10⁻⁴）；ᾱ = 2 时试探 2、1、½，第一个落在直线下方的被接受。然后在球面上运行 RGD + 回溯若干步。
  - 边界：L 只出现在保证里，算法本身不需要知道 L。
  - 尺度不变：把 f 换成 8f + 3，问题不变；若 ᾱ_k 使第一步 −ᾱ_k grad f(x_k) 不随 f 的正缩放改变，算法 4.1 + 4.2 产生相同的迭代。选法：ᾱ₀ = ℓ₀/‖grad f(x₀)‖（ℓ₀ 为第一步的期望长度）；ᾱ_k = 2(f(x_{k−1}) − f(x_k))/‖grad f(x_k)‖²（4.13），常再乘 1/τ，并设下限使其远离 0。
  - 用途：实际使用的 RGD 就是 RGD + 回溯；c07 说明线搜索的迭代映射可能不光滑。
- proof_steps：
  - 引理 4.12（A4.3 在 {(x, −α grad f(x)) : α ∈ [0, ᾱ]} 上成立）：
    1. 设 grad f(x) ≠ 0。由 A4.3，对试探的每个 α：f(x) − f(R_x(−α grad f(x))) ≥ (α − (L/2)α²)‖grad f(x)‖²。
    2. 若算法在 α 处未终止，则 f(x) − f(R_x(−α grad f(x))) < rα‖grad f(x)‖²。
    3. 两式同时成立 ⇒ α − (L/2)α² < rα ⇒ α > 2(1 − r)/L。所以一旦 α ≤ 2(1 − r)/L，算法必然终止。
    4. 终止的 α 要么就是 ᾱ，要么是上一个被拒绝（> 2(1 − r)/L）的步长乘 τ，所以 α ≥ min(ᾱ, 2τ(1 − r)/L)；下降量 ≥ r min(ᾱ, 2τ(1 − r)/L)‖grad f(x)‖²。
    5. 计数：α = ᾱτ^{n−1}，n 为计算次数；n = 1 + log_{τ⁻¹}(ᾱ/α) ≤ max(1, 2 + log_{τ⁻¹}(ᾱL/(2(1 − r))))。
  - 推论 4.13：c_k = r min(ᾱ_k, 2τ(1 − r)/L)；按命题 4.7 的裂项，f(x₀) − f_low ≥ K min c_k min ‖grad f(x_k)‖²；若 liminf ᾱ_k > 0，则 liminf c_k > 0，于是 ‖grad f(x_k)‖ → 0，速率同样为 1/√K。
- necessity：
  - liminf ᾱ_k > 0 不能去掉：ᾱ_k = 1/(k+2)² 时，每个步长都满足 Armijo 条件（步长很小），但正是 c04 的例子，迭代停在 ½（补充）。动画：沿用 c04 的停滞点，Armijo 检查每次都打绿勾，点仍然停住。
  - r < 1：f = ½x²，f(x) − f(x − αx) = x²(α − α²/2) ≥ rαx² ⇔ α ≤ 2(1 − r)；r ≥ 1 时没有正步长被接受，循环永不终止（补充）。
  - r > 0：r = 0 时接受 α = 2，f(x − 2x) = f(x)，迭代在 ±x 间来回，无下降（补充）。
  - τ < 1：τ = 1 时步长不缩短，ᾱ 太大则永远不终止（补充）。
- visual_events：
  - e1｜"Try big, shrink until good enough"｜S²，x，−grad；曲线面板 g(α)｜—｜—｜—
  - e2｜"The Armijo line"｜琥珀色直线 f(x) − rα‖grad‖²，从 g(0) 出发，斜率为切线斜率的 r 倍｜—｜—｜(4.12) 顶部
  - e3｜"Trial steps"｜试探点 ᾱ = 2、1、½ 依次落在 g 上；位于直线上方的变成空心红点，第一个位于下方的变绿｜每个试探同时在球面上画出落点｜—｜算法 4.2 框
  - e4｜"Where every step is accepted"｜面板上标出区间 (0, 2(1 − r)/L]：此处 c05 的二次上界低于 Armijo 直线｜区间着绿｜—｜—
  - e5｜"The returned step is not too small"｜推导五步｜每步对应面板高亮｜—｜ledger：α ≥ min(ᾱ, 2τ(1 − r)/L)
  - e6｜"RGD with backtracking"｜球面上迭代若干步，每步显示试探次数｜—｜—｜ledger：‖grad‖ → 0 if liminf ᾱ_k > 0
  - e7｜"Scale invariance"｜同一问题 f 与 8f + 3 的两条迭代路径完全重合｜—｜—｜(4.13)
  - e8｜"Initial steps shrinking to zero"｜c04 的停滞点；Armijo 检查绿勾｜—｜—｜红色标注 liminf ᾱ_k = 0
  - e9｜"Parameters out of range"｜三个小面板：r ≥ 1（无接受）、r = 0（来回跳）、τ = 1（不缩短）｜—｜—｜—
- outcome_check：给出 g(α) 的图与 Armijo 直线，观众能指出回溯会接受哪个试探步长；能说出为什么 r 必须严格介于 0 与 1 之间。
- source：BM §4.5，算法 4.2，(4.12)、(4.13)，引理 4.12，推论 4.13。参数反例为补充。
- next：全局保证是 1/√K，但实际中常看到梯度按指数下降。这是局部收敛的范畴。

### c07-local-convergence — 局部收敛：极小点附近为什么是线性速率

- question：观众能区分"全局收敛"与"收敛到全局极小"，写出线性与二次收敛的定义，叙述并证明局部压缩映射定理，并用它得到 RGD 在 Hess f(x*) ≻ 0 的极小点附近线性收敛、因子 ≤ 1 − 1/κ。
- requires：inverse-function-theorem、contraction-mapping（E03）、retraction（E06）、pullback（c02）、convergence-rate（本章）。
- music：proof
- teaching_sequence：
  - 直觉：远处的行为由全局保证描述；靠近极小点时，迭代映射近似为线性映射，误差每步乘以一个小于 1 的因子。
  - 两个易混点（BM 4.6）："全局收敛"指从任意 x₀ 出发都收敛到某处，不是收敛到全局极小；c04 也没有证明收敛，只证明了聚点是临界点。
  - 观察：瑞利商上固定步长 1/3 的 RGD，对数面板中 dist(x_k, e₃) 是一条直线，相邻比值实测 0.6667。
  - 定义 4.14（线性，R-线性）：存在 ε_k → 0，dist(a_k, a*) ≤ ε_k，ε_{k+1}/ε_k → μ ∈ (0, 1)；μ 的下确界为线性收敛因子；为 0 时超线性。定义 4.15（二次）：ε_{k+1}/ε_k² → μ < ∞。例子：2^{−k} 线性（μ = ½），2^{−2^k} 二次。Q-线性要求 ε_k 就是误差本身。
  - 预告工具（正式定义在后续集，此处只用所述性质）：
    - 黎曼距离 dist 把连通黎曼流形变成度量空间；指数映射 Exp 是一种 retraction，小 v 时 dist(x, Exp_x(v)) = ‖v‖（球面上为大圆）。
    - Hessian：在临界点 x*，Hess f(x*) 是 T_{x*}M 上的自伴线性映射，满足 f(R_{x*}(v)) = f(x*) + ½⟨v, Hess f(x*)[v]⟩ + O(‖v‖³)；梯度场在 x* 处的导数等于 Hess f(x*)；grad f(x*) = 0 且 Hess f(x*) ≻ 0 ⇒ 严格局部极小。瑞利商在 e₃：Hess f(e₃) = (A − λ_min I) 限制到 T_{e₃}S²，特征值 1、3。
  - 定理 4.16（流形上的反函数定理）：F: M → N 光滑，DF(x) 可逆 ⇒ 存在邻域 U、V 使 F|_U: U → V 为微分同胚。证明思路：用 chart 化为 E03 的定理。推论 4.17：DR_x(0) = id 可逆 ⇒ R_x 在 0 的邻域上是微分同胚；推论 4.18：有度量时邻域可取为球 B(x, r)。
  - 用途：定理 4.19 也用于后续的黎曼牛顿法（二次收敛）。
- proof_steps：
  - 定理 4.19（局部压缩映射）：F: M → M 光滑，F(x*) = x*，‖DF(x*)‖ < 1。
    1. 由推论 4.18 取 r，使 R_{x*}: B(x*, r) → U 为微分同胚。F⁻¹(U) 是含 x* 的开集，取 r' ≤ r 使 U' = R_{x*}(B(x*, r')) ⊆ F⁻¹(U) 且 U' ⊆ U。
    2. x_k ∈ U' ⇒ x_{k+1} = F(x_k) ∈ U；定义 ξ_k、ξ_{k+1} 满足 x_k = R_{x*}(ξ_k)。
    3. F̃ = R_{x*}⁻¹ ∘ F ∘ R_{x*} 是切空间上的光滑映射，ξ_{k+1} = F̃(ξ_k)；F̃(0) = 0，DF̃(0) = DF(x*)（链式法则与 DR_{x*}(0) = id）。
    4. Taylor：F̃(v) = DF(x*)[v] + E(v)，‖E(v)‖ ≤ c‖v‖²；所以 ‖ξ_{k+1}‖ ≤ (‖DF(x*)‖ + c‖ξ_k‖)‖ξ_k‖（4.14）。
    5. 缩小 r' 使 ‖DF(x*)‖ + cr' < 1：于是 ‖ξ_{k+1}‖ ≤ ‖ξ_k‖，序列留在 U' 中（归纳），且线性收敛，lim ‖ξ_{K+1}‖/‖ξ_K‖ ≤ ‖DF(x*)‖。取 R = Exp，‖ξ_k‖ = dist(x_k, x*)。
    6. 若 DF(x*) = 0，由（4.14）lim ‖ξ_{K+1}‖/‖ξ_K‖² ≤ c，二次收敛。
  - 引理 4.21：T_{(x,0)}TM = T_xM × T_xM，且 DR(x, 0)[(u, v)] = u + v。证明：(u, 0) 方向取 (c(t), 0)，R(c(t), 0) = c(t)，导数 u（用 R_x(0) = x）；(0, v) 方向取 (x, tv)，导数 v（用 DR_x(0) = id）；线性相加。
  - 定理 4.20（RGD 的局部速率）：grad f(x*) = 0，Hess f(x*) ≻ 0，特征值 λ₁ ≥ … ≥ λ_n > 0，κ = λ₁/λ_n，L > λ₁/2，F(x) = R_x(−(1/L) grad f(x))。
    1. F(x*) = R_{x*}(0) = x*。
    2. G(x) = −(1/L) grad f(x)，G(x*) = 0；由引理 4.21：DF(x*)[v] = DR(x*, 0)[(v, DG(x*)[v])] = v + DG(x*)[v]。
    3. 预告性质：DG(x*)[v] = −(1/L) Hess f(x*)[v]，所以 DF(x*) = Id − (1/L) Hess f(x*)（4.16），自伴，特征值 1 − λ_i/L。
    4. ‖DF(x*)‖ = max(|1 − λ₁/L|, |1 − λ_n/L|)（4.17）；L > λ₁/2 ⇒ 1 − λ₁/L > −1，且 λ_n > 0 ⇒ 1 − λ_n/L < 1，所以 ‖DF(x*)‖ < 1，定理 4.19 适用。
    5. L = λ₁ 时 ‖DF(x*)‖ = 1 − λ_n/λ₁ = 1 − 1/κ。
  - 引理 4.22：A4.3 在全切丛上成立且 x* 临界 ⇒ ⟨v, Hess f(x*)[v]⟩ ≤ L‖v‖²。证明：f(R_{x*}(tv)) ≤ f(x*) + L t²‖v‖²/2 与预告展开 f(x*) + t²⟨v, Hess v⟩/2 + O(t³) 比较，除以 t² 令 t → 0。所以 A4.3 的 L ≥ λ₁ > λ₁/2，可直接用于定理 4.20。瑞利商：L = 3 = λ₁，因子 1 − 1/3 = 2/3，与实测 0.6667 一致。
- necessity：
  - ‖DF(x*)‖ < 1 不能去掉：ℝ 上 F(x) = 2x，x* = 0 是不动点但排斥，任何 x₀ ≠ 0 都远离（补充）。边界情形 ‖DF(x*)‖ = 1：F(x) = x − x³ 收敛到 0，但 x_k ≈ 1/√(2k)，不是线性（补充）。动画：两条对数曲线，一条向上，一条变平。
  - Hess f(x*) ≻ 0 不能去掉：瑞利商在鞍点 e₂ 处 Hessian 特征值为 4 − 2 = 2 与 1 − 2 = −1，DF 有特征值 1 + 1/L > 1；从 e₂ 附近出发的迭代沿 e₃ 方向被推开，最终到达 e₃（补充，数值核对）。
  - L > λ₁/2 不能去掉：L ≤ λ₁/2 时 1 − λ₁/L ≤ −1，迭代在 x* 两侧来回且不收敛；ℝ 上 f = ½x²（λ = 1），步长 1/L = 2 时 x_{k+1} = −x_k，步长 2.2 时发散（补充）。
  - 证明中的 retraction（取 Exp）与算法中的 retraction 无关；回溯线搜索的迭代映射可能不光滑，定理 4.19 不直接适用（线搜索版本见 [AMS08, Thm 4.5.6]）。
- visual_events：
  - e1｜"Global convergence is not convergence to a global minimizer"｜两个标签对比｜—｜—｜—
  - e2｜"Observed: a straight line on a log scale"｜S² 上 RGD 迭代到 e₃；对数面板 dist(x_k, e₃)｜相邻比值读数 0.667｜—｜—
  - e3｜"Linear and quadratic rates"｜两条参考序列 2^{−k}、2^{−2^k} 在对数面板上｜—｜—｜定义 4.14、4.15
  - e4｜"Preview: distance, exponential map, Hessian"｜球面大圆与 dist；e₃ 处切平面上 Hess 的椭圆等值线（轴长比 √3）｜—｜—｜三行预告标签，标 "preview"
  - e5｜"Retractions are local diffeomorphisms"｜T_xM 中的球 B(x, r) 被 R_x 映成 M 上的邻域｜—｜—｜定理 4.16、推论 4.17–4.18（链接 E03）
  - e6｜"Local contraction mapping"｜切空间中 ξ_k 逐步缩短的箭头链；(4.14) 推导｜每步一个箭头｜—｜ledger：‖DF(x*)‖ < 1 ⇒ linear, factor ≤ ‖DF(x*)‖
  - e7｜"Differentiate the RGD map"｜引理 4.21 两条曲线 (c(t), 0) 与 (x, tv)｜—｜—｜DF(x*) = Id − Hess/L
  - e8｜"Eigenvalues 1 − λ/L"｜数轴 (−1, 1) 上画 1 − λ₁/L、1 − λ_n/L；L 滑块移动｜L 降到 λ₁/2 以下时左端点越出 −1 变红｜—｜ledger：factor ≤ 1 − 1/κ
  - e9｜"L from A4.3 is large enough"｜引理 4.22 一行；瑞利商读数 L = 3 = λ₁｜—｜—｜—
  - e10｜"Repelling and borderline fixed points"｜F(x) = 2x 与 x − x³ 的蛛网图｜—｜—｜—
  - e11｜"A saddle pushes iterates away"｜S² 上从 e₂ 附近出发的迭代远离 e₂、到达 e₃｜—｜—｜标注 Hess has a negative eigenvalue
- outcome_check：观众能根据 Hessian 的特征值算出步长 1/λ₁ 时的局部收敛因子，并说出当 L 太小时会发生什么。
- source：BM §4.6，定义 4.14、4.15，定理 4.16、4.19、4.20，推论 4.17、4.18，引理 4.21、4.22，(4.14)–(4.19)。Hessian、Exp、dist 的性质来自 BM 5.5、6.1、10.1、10.2 节（预告）。一维与鞍点反例为补充。
- next：所有这些都假设我们能算出 grad f。实际中怎么推导它？

### c08-computing-gradients — 推导梯度：方向导数、伴随与投影

- question：观众能用"写出 Df(x)[v]，再用伴随整理成 ⟨g, v⟩"的方法推导梯度，能推出 ‖F(x)‖² 的梯度 2DF(x)*[F(x)]、X⁻¹ 的微分、log det X 的梯度，并说出黎曼子流形上的梯度是欧氏梯度的投影。
- requires：riemannian-gradient（E06）、chain-rule（E03）。
- music：definition
- teaching_sequence：
  - 直觉：梯度由等式 Df(x)[v] = ⟨grad f(x), v⟩_x 唯一确定（4.20），所以只要把方向导数写成"某个向量与 v 的内积"。
  - 方法（BM 4.7）：① 写出 Df(x)[v]；② 用伴随把 v 单独移到内积一侧；③ 由唯一性读出 grad f(x)。
  - 三条规则：链式法则（4.21）；乘积法则 D(FG)(x)[v] = DF(x)[v]G(x) + F(x)DG(x)[v]（4.22），对逐元乘积、Kronecker 积同样成立；内积法则（4.25）。
  - 例子：
    - f(x) = ‖F(x)‖²：Df(x)[v] = 2⟨F(x), DF(x)[v]⟩ = 2⟨DF(x)*[F(x)], v⟩，所以 grad f(x) = 2DF(x)*[F(x)]（4.27）。
    - F(X) = X⁻¹：对 F(X)X = I 求导得 DF(X)[U] = −X⁻¹UX⁻¹（4.30）。
    - g(X) = log det X：log det(X + tU) = log det X + log det(I + tX⁻¹U) = log det X + t Tr(X⁻¹U) + O(t²)，所以正定矩阵上 grad g(X) = X⁻¹（例 4.28，迹内积）。
    - 子流形：先求欧氏梯度，再正交投影到切空间（BM 命题 3.61，E06）。瑞利商：欧氏梯度 Ax，grad f(x) = (I − xxᵀ)Ax。
  - "梯度很便宜"原则：对一大类函数，算梯度的运算量不超过算函数值的若干倍（常为 5 倍以内），并可复用中间结果；这是自动微分的基础，Manopt 等工具提供流形上的自动微分。
  - 边界：伴随依赖内积：同一个 Df，换内积后读出的梯度不同（E06 c05）；复数情形用实内积 ℜ{u*v}，转置换成共轭转置（例 4.30）。
  - 用途：c09 检查推导出的梯度。
- proof_steps：
  1. 乘积法则：H(x) = F(x)G(x)，沿曲线 c，(H∘c)'(0) = (F∘c)'(0)G(x) + F(x)(G∘c)'(0)（矩阵乘法双线性，一元乘积法则逐项适用）。
  2. (4.27)：内积法则给出 Df(x)[v] = ⟨DF(x)[v], F(x)⟩ + ⟨F(x), DF(x)[v]⟩ = 2⟨F(x), DF(x)[v]⟩；伴随定义 ⟨w, DF(x)[v]⟩ = ⟨DF(x)*[w], v⟩_x；由唯一性 grad f(x) = 2DF(x)*[F(x)]。
  3. (4.30)：0 = D(F(X)X)[U] = DF(X)[U]X + F(X)U，右乘 X⁻¹。
  4. 例 4.28：det(I + tB) = Π(1 + tλ_i(B)) = 1 + t Tr B + O(t²)，log(1 + at) = at + O(t²)；Tr(X⁻¹U) = ⟨X⁻ᵀ, U⟩，X 对称时 = ⟨X⁻¹, U⟩。
- necessity：
  - 投影不能省：在 S² 上把欧氏梯度 Ax 直接当作梯度，它有法向分量 (xᵀAx)x，不在 T_xS² 中；retraction 只接受切向量。c09 说明这个错误逃过斜率检查，必须单独检查（补充）。
- visual_events：
  - e1｜"Gradients are defined by an identity"｜顶部 (4.20)；方块图：Df(x)[v] → 伴随 → ⟨g, v⟩ → grad f = g｜三个方块依次点亮｜—｜—
  - e2｜"Three rules"｜三行规则｜—｜—｜ledger：chain, product, inner product
  - e3｜"Squared norms"｜(4.27) 推导两行；左侧 F 把 T_xM 映到 E，DF* 反向箭头｜—｜—｜ledger：grad ‖F‖² = 2DF*[F]
  - e4｜"Matrix inverse"｜F(X)X = I 求导；2×2 数值例子 X、U 与 −X⁻¹UX⁻¹，与有限差分读数对照｜—｜—｜(4.30)
  - e5｜"Log-determinant"｜推导三行；特征值乘积 Π(1 + tλ_i)｜—｜—｜grad = X⁻¹
  - e6｜"On a submanifold, project"｜S²，x，欧氏梯度 Ax（红色，伸出球面）分解为切向（白色）与法向（红色虚线）｜法向分量淡出｜—｜grad f(x) = (I − xxᵀ)Ax
  - e7｜"Gradients are cheap"｜条形对比：cost of f 与 cost of grad f（≤ 5×）｜—｜—｜—
- outcome_check：给出 f(x) = ‖Bx − y‖²（B 为矩阵），观众能用 (4.27) 写出 grad f(x) = 2Bᵀ(Bx − y)。
- source：BM §4.7，(4.20)–(4.30)，例 4.23、4.24、4.28、4.30，命题 3.61（引用）。投影反例为补充；outcome_check 中的最小二乘为补充练习。
- next：推导容易出错。怎样用数值方法检查？

### c09-checking-gradients — 数值检查梯度：log–log 斜率测试

- question：观众能写出 E(t) = |f(R_x(tv)) − f(x) − t⟨grad f(x), v⟩| = O(t²)，读懂 log–log 图上斜率 2 与斜率 1 的含义，并说出为什么还必须单独检查梯度是否在切空间中。
- requires：taylor-on-curves（c02）、gradient-recipe（c08）。
- music：counterexample
- teaching_sequence：
  - 直觉：正确的梯度让一阶 Taylor 预测的误差按 t² 缩小；错误的梯度留下一个按 t 缩小的误差。
  - 方法（BM 4.8）：① 先检查 grad f(x) ∈ T_xM；② 随机 x 与单位切向量 v；③ 计算 f(x)、grad f(x)、⟨grad f(x), v⟩；④ t 在 [10⁻⁸, 1] 上对数均匀取值，计算 E(t)；⑤ 画 log–log 图；⑥ 检查是否在一两个数量级以上呈斜率 2。由 (4.3)，log E(t) ≈ 2 log t + 常数。
  - 为什么斜率 1：若代码给出 g ≠ grad f(x)，E(t) = |t⟨grad f(x) − g, v⟩ + O(t²)|，小 t 时 ≈ t|⟨grad f − g, v⟩|。
  - 两端偏离：大 t 时 Taylor 近似不准；小 t 时浮点舍入主导（E(t) 是相近数之差）。只看中间一段。
  - 例子（BM 例 4.34、图 4.1）：Stiefel 流形 St(n, p) 上 f(X) = −½Tr(XᵀAX)，梯度为 −AX 的切向投影；代码漏写负号时斜率约 1，改正后斜率约 2。Manopt 中为 checkgradient。
  - 边界：余项若为 O(t^k)，k > 2，斜率为 k（罕见，更好）。
  - 用途：任何新问题写好代价函数与梯度后先跑这个检查。
- proof_steps：
  1. 由 (4.3)：f(R_x(tv)) = f(x) + t⟨grad f(x), v⟩ + O(t²)，所以 E(t) = O(t²)。
  2. 若用 g 代替 grad f(x)：E(t) = |t⟨grad f(x) − g, v⟩ + O(t²)|；⟨grad f(x) − g, v⟩ ≠ 0 时小 t 下 E(t) ≈ Ct，斜率 1。
- necessity：
  - 切向检查不能省（补充）：在 S² 上用未投影的欧氏梯度 Ax。对切向 v，⟨Ax, v⟩ = ⟨(I − xxᵀ)Ax, v⟩，法向分量与 v 正交，被内积"看不见"，斜率测试显示斜率 2 并通过；但 xᵀ(Ax) = 2f(x) ≠ 0，说明它不在 T_xS² 中。动画：log–log 图斜率 2 打绿勾；旁边切向检查读数 xᵀg ≠ 0 打红叉。
- visual_events：
  - e1｜"Compare f with its first-order prediction"｜S²，x，v，retraction 曲线；曲线面板 g(t) 与预测直线，竖线标出 E(t)｜t 缩小，E(t) 变短｜—｜(4.38)
  - e2｜"On a log–log plot"｜对数面板：E(t) 曲线与斜率 2 的参考虚线｜t 从 1 扫到 10⁻⁸，点逐个落下｜—｜中段加粗，读数 slope ≈ 2
  - e3｜"A wrong gradient leaves slope one"｜同一面板加红色曲线（漏负号的梯度），参考虚线斜率 1｜—｜—｜读数 slope ≈ 1
  - e4｜"Both ends are unreliable"｜左端浮点平台、右端 Taylor 失效区灰色阴影｜—｜—｜—
  - e5｜"The Stiefel example"｜两栏复刻图 4.1 的形状（wrong / correct），代码行 problem.grad = …｜—｜—｜—
  - e6｜"Check tangency first"｜S² 上 Ax 与其切向投影；斜率测试绿勾，切向检查红叉｜—｜—｜ledger：check grad ∈ T_xM, then slope 2
- outcome_check：给出一条 log–log 曲线，观众能判断梯度是否可能正确，并说出一个能通过斜率测试的错误。
- source：BM §4.8，(4.38)，例 4.34，图 4.1。未投影梯度的反例为补充。
- next：回顾本章的工具链，以及下一步需要的新几何。

### c10-recap — 回顾：一阶方法的工具链与下一步

- question：观众能按依赖顺序复述本集结论链，并说出哪些更强的算法需要新的几何工具。
- requires：本集全部。
- music：recap
- teaching_sequence：
  - 结论链：Taylor 展开与拉回 → 临界点 ⇔ grad = 0 → RGD + A4.1 + A4.2 ⇒ ‖grad‖ → 0，min ‖grad‖ ≤ C/√K → A4.3 ⇒ 步长 (0, 2/L) 给出 A4.2；1/L 时 K ≥ 2L(f₀ − f_low)/ε² → 回溯：不知道 L 也有同样保证 → 局部：Hess ≻ 0 ⇒ 线性收敛，因子 1 − 1/κ → 推导梯度、检查梯度。
  - 局限：最坏情形 1/√K 是紧的（ℝⁿ 上也存在困难函数，BM 4.6）；κ 大时线性收敛很慢。
  - 下一步（BM 4.9）：非线性共轭梯度、BFGS、随机梯度需要把切向量从一个切空间搬到另一个（向量传输，BM 10.5）；牛顿法与信赖域需要 Hessian（BM 第 5、6 章），定理 4.19 的二次情形将在那里使用。
- proof_steps：无
- necessity：无
- visual_events：
  - e1｜"From a Taylor expansion to a complexity bound"｜结论链方块图逐块点亮，每块标章号｜—｜—｜—
  - e2｜"The Rayleigh quotient, once more"｜S² 上 RGD + 回溯从多个初值出发，全部到达 ±e₃，只有一条恰好从 e₂ 出发的停在鞍点上（零测集）｜—｜—｜—
  - e3｜"What comes next"｜两个路标：transporters → CG, BFGS；Hessian → Newton, trust regions｜—｜—｜—
- outcome_check：观众能说出本集每个结论依赖的假设。
- source：BM §4.6 开头说明、§4.9。
- next：后续集（向量传输或二阶几何，视课程顺序而定）。

## Glossary additions

| id | en | zh | symbol | spoken |
|---|---|---|---|---|
| minimizer | minimizer | 极小点 | x* | minimizer |
| local-minimizer | local minimizer | 局部极小点 | — | local minimizer |
| accumulation-point | accumulation point | 聚点 | — | accumulation point |
| pullback | pullback | 拉回 | f∘R_x | pullback |
| riemannian-gradient-descent | Riemannian gradient descent | 黎曼梯度下降 | RGD | Riemannian gradient descent |
| line-search | line search | 线搜索 | — | line search |
| step-size | step size | 步长 | α_k | step size |
| sufficient-decrease | sufficient decrease | 充分下降 | f(x_k) − f(x_{k+1}) ≥ c‖grad f(x_k)‖² | sufficient decrease |
| lipschitz-type-condition | Lipschitz-type condition | Lipschitz 型条件 | A4.3 | Lipschitz type condition |
| iteration-complexity | iteration complexity | 迭代复杂度 | O(1/ε²) | iteration complexity |
| backtracking | backtracking line search | 回溯线搜索 | — | backtracking line search |
| armijo-condition | Armijo condition | Armijo 条件 | f(x) − f(R_x(−α grad)) ≥ rα‖grad‖² | Armijo condition |
| linear-convergence | linear convergence | 线性收敛 | ε_{k+1}/ε_k → μ < 1 | linear convergence |
| quadratic-convergence | quadratic convergence | 二次收敛 | ε_{k+1}/ε_k² → μ | quadratic convergence |
| condition-number | condition number | 条件数 | κ = λ_max/λ_min | condition number |
| riemannian-hessian | Riemannian Hessian | 黎曼 Hessian | Hess f(x) | Riemannian Hessian |
| exponential-map | exponential map | 指数映射 | Exp_x | exponential map |
| riemannian-distance | Riemannian distance | 黎曼距离 | dist | Riemannian distance |
| adjoint | adjoint | 伴随 | DF(x)* | adjoint |
| rayleigh-quotient | Rayleigh quotient | 瑞利商 | ½xᵀAx | Rayleigh quotient |
| gradient-check | gradient check | 梯度检查 | E(t) = O(t²) | gradient check |
| automatic-differentiation | automatic differentiation | 自动微分 | AD | automatic differentiation |

## 估计时长

| 章 | 估计分钟 |
|---|---|
| c01-problem-and-sequences | 3.5 |
| c02-taylor-on-curves | 3.0 |
| c03-critical-points | 3.5 |
| c04-rgd-and-sufficient-decrease | 4.5 |
| c05-lipschitz-type-condition | 5.0 |
| c06-backtracking | 4.5 |
| c07-local-convergence | 6.5 |
| c08-computing-gradients | 3.5 |
| c09-checking-gradients | 3.0 |
| c10-recap | 2.0 |
| 合计 | 约 39 |
