# E06 — Riemannian Gradient and Retraction

## 全集框架

- 核心问题：在约束集 M 上做一步"梯度下降"，必须分别回答两件事：往哪个方向走？怎样走才能留在 M 上？本集用微分、对偶空间、Riesz 表示和黎曼度量回答第一问，得到黎曼梯度 grad f(x)；用 retraction 回答第二问，并证明沿 R_x(−t·grad f(x)) 走时，f 的初始变化率等于 −‖grad f(x)‖²_x。
- 受众起点：知道光滑映射（E02）、导数与链式法则（E03）、正则水平集与图像 chart φ / ψ（E04）、用曲线速度定义的切空间 T_xM = ker Dh(x)、球面切空间 x^⊥、O(n) 切空间 R·Skew(n)（E05）。知道有限维向量空间、线性映射、维数、秩–零化度（E05 已建立）、欧氏内积。不假定见过对偶空间、Riesz 表示或 Cauchy–Schwarz 的证明。
- 主线：欧氏梯度步在 M 上失效 → 拆成两个问题 → 用曲线定义微分 df_x，证明良定义与线性 → df_x 是余向量，只能"测量"方向、不能直接作为步进方向 → Riesz 表示：内积把余向量变成向量 → 反例：换一个内积，梯度方向随之改变，所以度量是必需的 → 黎曼度量与黎曼梯度 → Cauchy–Schwarz：grad 是最速上升方向 → 直线步离开 M → retraction 的定义、每个条件的必要性、γ'(0)=v 的证明 → 球面归一化例子 → 下降性质 −‖grad f‖² → 全系列回顾。
- 内容依赖：

| content_id | 内容 | 前置 | 建立位置（受众已知 / eXX-cNN） |
|---|---|---|---|
| smooth-map | 光滑映射：坐标表示 ψ∘F∘φ⁻¹ 光滑 | chart、smooth-atlas | e02-c06 |
| derivative-chain-rule | 导数是最佳线性近似；链式法则 D(F∘G)=DF·DG | 多元微积分 | e03-c02；链式法则受众已知 |
| graph-chart | 正则水平集 M 在 x 附近 = 图像 {(u,g(u))}；chart φ=投影到前 n−k 个坐标，ψ(u)=(u,g(u)) | implicit-function-theorem、regular-value | e04-c06 |
| tangent-by-curves | T_xM = {γ'(0) : γ 是 M 中过 x 的光滑曲线} | embedded-submanifold | e05-c02 |
| tangent-kernel | T_xM = ker Dh(x)，是 ℝⁿ 中 n−k 维线性子空间 | tangent-by-curves、rank-nullity | e05-c04/e05-c05 |
| sphere-tangent | T_xS^{n−1} = x^⊥ | tangent-kernel | e05-c06 |
| orthogonal-tangent | T_R O(n) = R·Skew(n) | tangent-kernel | e05-c09 |
| linear-algebra-basics | 向量空间、线性映射、基、维数、秩–零化度 | — | 受众已知；秩–零化度在 E05 复习 |
| euclidean-inner-product | ℝⁿ 上 uᵀv，正定、对称、双线性 | — | 受众已知 |
| differential | df_x[γ'(0)] = (f∘γ)'(0) | smooth-map、tangent-by-curves、graph-chart、derivative-chain-rule | 本集 c02 |
| dual-space | V* = {线性 ℓ: V→ℝ}，dim V* = dim V | linear-algebra-basics | 本集 c03 |
| riesz | 有内积时 Φ(u)=⟨u,·⟩ 是 V→V* 的同构 | dual-space、inner-product、rank-nullity | 本集 c04 |
| metric-dependence | 同一个 df 在不同内积下给出不同的梯度 | riesz | 本集 c05 |
| riemannian-metric | x ↦ g_x 光滑变化的切空间内积 | tangent-kernel、inner-product | 本集 c06 |
| riemannian-gradient | g_x(grad f(x), v) = df_x[v]，∀v ∈ T_xM | riesz、riemannian-metric、differential | 本集 c06 |
| steepest-ascent | 在 g_x-单位向量中，grad/‖grad‖ 使 df_x 最大 | riemannian-gradient、cauchy-schwarz | 本集 c07 |
| retraction | R_x: T_xM→M 光滑，R_x(0)=x，d(R_x)_0 = id | differential、tangent-by-curves | 本集 c08 |
| sphere-retraction | R_x(v) = (x+v)/‖x+v‖ 满足两个条件 | retraction、sphere-tangent | 本集 c09 |
| descent-property | d/dt f(R_x(−t·grad f))\|₀ = −‖grad f(x)‖²_x | retraction、riemannian-gradient、differential | 本集 c09 |

- 本集使用的术语：differential、dual-space、riesz-representation、riemannian-metric、riemannian-manifold、riemannian-gradient、retraction、tangent-space、kernel、smooth-map、chart、embedded-submanifold、level-set、regular-value、orthogonal-group、skew-symmetric-matrix、rank-nullity、jacobian；新增术语见文末 Glossary additions。

### 全集画面约定

- 主舞台：Three.js 中的单位球 S²，配一个光滑函数 f，用颜色图与等值线显示。全集统一使用高度函数 f(x) = x₃，在 S² 上即 f(x) = e₃ᵀx。点 x 固定在 x = (sin 50°·cos 30°, sin 50°·sin 30°, cos 50°) 附近，避免落在极点（极点处 grad f = 0）。
- 切平面 T_xM：半透明正方形贴在 x 处，带两条正交基向量 e₁ˣ、e₂ˣ 的细箭头。
- 2D 平面场景（c03–c05、c07）：把切平面"摘下来"平铺到屏幕左侧作为 ℝ² 坐标系，与 3D 球之间用连线指明来源。
- 证明账本（ledger）：屏幕右上角的面板，宽 560 px，最多显示 4 行已建立的事实。新事实从底部进入，第 5 条进入时最上面一条淡出。账本在每章开头清空，再写入本章要用到的前置事实（标注来源集）。
- 公式区：右侧中部，KaTeX，最多 3 行。字幕区：底部 220 px 内不放任何图形。
- 配色：f 增大为暖色、减小为冷色；切向量为青色；"错误/离开 M"的对象为红色虚线；余向量的等值线束为琥珀色；梯度箭头为白色粗箭头。

## 章节

### c01-two-questions — 一步梯度下降，在曲面上为什么会坏掉

- question：观众能说出：在 ℝⁿ 中 x − α∇f(x) 同时回答了"往哪走"和"怎么走"；在 M 上这两个问题必须分开回答，并分别需要什么工具。
- requires：sphere-tangent、orthogonal-tangent（E05）；欧氏梯度下降（受众已知）。
- music：motivation
- teaching_sequence：
  - 直觉：在 ℝⁿ 中，一阶展开 f(x − α∇f) = f(x) − α‖∇f(x)‖² + o(α)，所以小步一定下降。这一句里，"方向"是 −∇f(x)，"走"是向量加法。
  - 定义：本章不引入新定义，只列出两个问题（HW p13）：① 怎样确定往哪个方向走？② 怎样走？
  - 例子：S² 上 f(x)=x₃，从 x 出发做 x − α∇f̄(x)，其中 ∇f̄ = e₃，结果离开球面；O(n) 上 R − αG 一般不满足 (R−αG)ᵀ(R−αG) = I，用 n=2 的数值矩阵展示 RᵀR 偏离 I。
  - 边界：欧氏梯度 e₃ 本身也不在 T_xS² 中，它有一个分量指向球外。所以"方向"也坏了，不只是"走"坏了。
  - 用途：本集结构。① 需要 df_x（f 怎样随方向变化）加上内积（什么叫"最陡"），得到 grad f；② 需要 retraction。
- proof_steps：无
- necessity：ℝⁿ 中两个问题被一个公式掩盖：T_xℝⁿ = ℝⁿ，而"移动"就是加法。M 上 T_xM ≠ M，向量加法会把点带出 M。如果不把两个问题分开，就既得不到合法方向，也得不到合法的点。
- visual_events：
  - e1｜"In flat space, gradient descent is one line"｜2D 平面上 f 的等值线、点 x、箭头 −∇f、一个小步落点｜点沿箭头移动，f 值读数下降｜等值线保留｜屏幕显示 x_{k+1} = x_k − α∇f(x_k)
  - e2｜"This one line answers two questions at once"｜公式拆成两个高亮块："−∇f(x)" 标为 ①Direction、"x + (·)" 标为 ②Move｜两块分别上色｜公式保留｜两个标签停在公式上方
  - e3｜"Now constrain x to the sphere"｜S²，f=x₃ 的颜色图与等值线，点 x，箭头 e₃（红色）｜箭头从 x 指出；红色虚线 x − αe₃ 的落点离开球面，并显示 ‖x − αe₃‖ ≠ 1 的数值读数｜球与颜色保留｜红点悬在球外
  - e4｜"Even the direction is wrong"｜切平面 T_xS² 出现；e₃ 分解为切向分量（青色）与法向分量（红色）｜法向分量闪烁｜切平面保留｜标注"not in T_xM"
  - e5｜"The same failure on rotations"｜右侧 2×2 矩阵面板：R（旋转 30°），G（任意矩阵），R − αG，以及 (R−αG)ᵀ(R−αG) 的数值｜α 从 0 增加到 0.3，乘积偏离 I 的元素变红｜—｜面板显示 "≠ I"
  - e6｜"So we split the problem"｜ledger 写入两行：① Direction → need df_x and an inner product → grad f(x)；② Move → need a retraction R_x｜两行依次出现｜球淡化成背景｜本集路线图
- outcome_check：给出 M 上的点 x 与函数 f，观众能说出 x − α∇f̄(x) 的两处问题：方向不在 T_xM 中，落点不在 M 上。
- source：HW p13（Stuff we need ①②）；BD（retraction 板书的上下文）。O(n) 数值例子为补充。
- next：第一问先要回答"f 沿某个切方向变化多快"，也就是 df_x。

### c02-differential-by-curves — 用曲线定义微分：良定义与线性

- question：观众能用曲线定义 df_x[v]，并能解释：为什么这个值只取决于 v、不取决于选哪条曲线，以及为什么 df_x 是线性映射。
- requires：smooth-map（E02）、derivative-chain-rule（E03）、graph-chart（E04）、tangent-by-curves、tangent-kernel（E05）。
- music：proof
- teaching_sequence：
  - 直觉：f 只定义在 M 上，不能写 f(x + tv)，因为 x + tv 不在 M 上。但沿着 M 内的一条曲线 γ 走，f∘γ 是普通的一元函数，可以求导。
  - 定义（HW p11、p13，BD）：设 f: M → N 光滑，x ∈ M，v ∈ T_xM。取 M 中光滑曲线 γ: (−ε,ε) → M，使 γ(0)=x、γ'(0)=v，定义 df_x[v] := (f∘γ)'(0)。f∘γ 是 N 中过 f(x) 的曲线，所以 df_x[v] ∈ T_{f(x)}N，于是 df_x : T_xM → T_{f(x)}N。证明以 N = ℝ（或 ℝ^m）展开；N 为 ℝ^m 中嵌入子流形时，同一证明逐分量适用。
  - 例子：S² 上 f(x)=x₃。取两条过 x、速度都为 v 的曲线：大圆 γ₁(t) = cos(t‖v‖)x + sin(t‖v‖)v/‖v‖，以及一条速度同为 v、但二阶弯曲不同的曲线 γ₂(t) = (x + tv + t²w)/‖x + tv + t²w‖，其中 w 为固定切向量。数值显示 (f∘γ₁)'(0) 与 (f∘γ₂)'(0) 相等，都等于 e₃ᵀv。
  - 边界：可算性规则。若 f 是某个定义在 x 附近 ℝⁿ 开集 U 上的光滑函数 f̄ 在 M∩U 上的限制，则 df_x[v] = Df̄(x)[v]。不同的延拓 f̄ 在整个 ℝⁿ 上导数不同，但限制到 T_xM 上一致。例：S² 上 f̄₁(x)=x₃，f̄₂(x)=x₃ + (xᵀx − 1)·5，二者在 S² 上相等；Df̄₂(x)[v] − Df̄₁(x)[v] = 10·xᵀv，它在 v ∈ x^⊥ 时为 0。
  - 用途：df_x 是本集第一问的原材料。c09 的下降性质要用到其线性与曲线定义。
- proof_steps：
  1. 设定。M = h⁻¹(c) ⊆ ℝⁿ 为正则水平集，x ∈ M。由 E04，重排坐标后 x = (a,b)，存在开集 A ⊆ ℝ^{n−k}、B ⊆ ℝ^k 和光滑 g: A → B，使 M ∩ (A×B) = {(u, g(u)) : u ∈ A}。chart φ: M∩(A×B) → A 为 φ(y) = π(y)，其中 π: ℝⁿ → ℝ^{n−k} 取前 n−k 个坐标（线性映射）；逆为 ψ(u) = (u, g(u))。
  2. 曲线落在 chart 内。γ 连续且 γ(0) = x ∈ A×B（开集），所以存在 δ > 0，当 |t| < δ 时 γ(t) ∈ M∩(A×B)。在此区间上 γ(t) = ψ(φ(γ(t)))。
  3. 分解。于是 f∘γ = (f∘ψ)∘(φ∘γ)。由 E02 光滑映射的定义，f 光滑意味着坐标表示 f∘ψ: A → ℝ 光滑。φ∘γ = π∘γ 是 ℝ^{n−k} 中的光滑曲线。
  4. 链式法则。(f∘γ)'(0) = D(f∘ψ)(a)·(π∘γ)'(0) = D(f∘ψ)(a)·π(γ'(0)) = D(f∘ψ)(a)·π(v)。第二个等号用到 π 是线性映射，所以 (π∘γ)' = π∘γ'。
  5. 良定义。右边只含 a = φ(x)、f∘ψ 和 v，不含 γ。所以任意两条 γ(0)=x、γ'(0)=v 的曲线给出同一个值。定义式 (f∘γ)'(0) 本身不涉及 chart，chart 只是证明工具，所以结论与 chart 的选择无关。
  6. 线性。v ↦ D(f∘ψ)(a)·π(v) 是两个线性映射 π 与 D(f∘ψ)(a) 的复合，所以 df_x 线性：df_x[αv + βw] = α·df_x[v] + β·df_x[w]。
  7. 每个 v ∈ T_xM 都有曲线实现，这是 T_xM 的定义（E05）。所以 df_x 在整个 T_xM 上有定义。
  8. 可算性规则。若在 x 的某个 ℝⁿ 邻域 U 上有光滑 f̄，且 f̄ = f 在 M∩U 上成立，则对 |t| 足够小有 f∘γ = f̄∘γ。由 ℝⁿ 中的链式法则，(f∘γ)'(0) = Df̄(x)[γ'(0)] = Df̄(x)[v]。
- necessity：
  - 为什么不能用 f(x+tv) 定义：f 只在 M 上有定义，x+tv ∉ M（S² 上 ‖x+tv‖² = 1 + t²‖v‖² > 1）。
  - 为什么要证良定义：同一个 v 有无穷多条曲线代表。若值依赖曲线，df_x[v] 就不是 v 的函数。动画展示 γ₁、γ₂ 二阶不同、一阶相同。
  - 延拓的多样性：f̄₁、f̄₂ 的欧氏梯度不同（∇f̄₂ = e₃ + 10x），但在 T_xM 上给出同一个 df_x。所以 ∇f̄ 不能直接充当"f 在 M 上的梯度"，c06 会回到这一点。
- visual_events：
  - e1｜"f lives only on the sphere"｜S²，颜色图 f=x₃，点 x，切向量 v（青色）｜沿 v 的直线 x+tv 画为红色虚线，并离开球面｜—｜标注 "f(x+tv) undefined"
  - e2｜"Walk along a curve inside M instead"｜曲线 γ₁（大圆，白色）过 x，速度 v｜一个小点沿 γ₁ 移动；左下角小图绘制 t ↦ f(γ₁(t))，并在 t=0 处画切线｜球与 v 保留｜小图显示斜率读数
  - e3｜"Define df_x[v] as that slope"｜公式区 df_x[v] := (f∘γ)'(0)，γ(0)=x，γ'(0)=v｜公式逐项出现｜曲线与小图保留｜ledger 写入定义
  - e4｜"But many curves share the same velocity"｜第二条曲线 γ₂（橙色），在 x 处与 γ₁ 相切，随后弯离｜小图上叠加 t ↦ f(γ₂(t))，两条函数曲线在 t=0 处切线重合，远处分开｜γ₁ 保留｜两个斜率读数相同
  - e5｜"Zoom into the graph chart"｜S² 在 x 附近的一片高亮，下方平铺区域 A ⊆ ℝ²，标注 φ = π（向下箭头）与 ψ(u)=(u,g(u))（向上箭头）｜γ₁、γ₂ 投影为 A 中的两条曲线，在 a 处速度相同，都是 π(v)｜球片保留｜A 中两条曲线共切线
  - e6｜"Chain rule: only π(v) enters"｜公式区：(f∘γ)'(0) = D(f∘ψ)(a)·π(γ'(0)) = D(f∘ψ)(a)·π(v)｜"γ" 在等式右侧被划去，"v" 高亮｜A 图保留｜ledger：df_x well-defined
  - e7｜"Composition of linear maps is linear"｜v → π(v) → D(f∘ψ)(a)π(v) 三个方框｜两个箭头标"linear"｜—｜ledger：df_x linear
  - e8｜"In practice: differentiate any smooth extension"｜两个延拓 f̄₁=x₃、f̄₂=x₃+5(xᵀx−1)，各自的欧氏梯度箭头 e₃ 与 e₃+10x（后者明显指向球外）｜两箭头投影到切平面后重合为同一个切向分量；显示 10·xᵀv = 0｜切平面保留｜标注 "same df_x on T_xM"
- outcome_check：观众能回答：为什么 df_x[v] 与曲线无关？（chart 中只有 π(v) 进入链式法则。）又能用 Df̄(x)[v] 算出 S² 上 f=x₃ 的 df_x[v] = e₃ᵀv。
- source：HW p11（f: X→Y、γ、φ(t)=f∘γ(t)）、HW p13（df_x: T_x(X) → T_{f(x)}(Y)）、BD（"Now suppose X,Y smooth manifolds" 板书）。良定义与线性的证明以及延拓规则为补充，基于 E04 的图像 chart。
- next：当 N = ℝ 时，df_x 把切向量变成一个数。这样的对象是什么？能直接拿来走吗？

### c03-covector-not-direction — df_x 是余向量：会测量，不会指路

- question：观众能说出 df_x ∈ (T_xM)*，画出余向量的"等值线束"图像，并解释为什么余向量不能直接作为步进方向。
- requires：differential（c02）、linear-algebra-basics（受众已知）。
- music：definition
- teaching_sequence：
  - 直觉：df_x 吃进一个方向、吐出一个数，它是测量工具，不是方向。
  - 定义（HW p14）：有限维实向量空间 V 的对偶空间 V* = {ℓ: V → ℝ | ℓ 线性}，在逐点加法与数乘下是向量空间，其元素称为线性泛函（余向量）。当 f: M → ℝ 时，df_x ∈ (T_xM)*（HW p13）。
  - 例子：V = ℝ²，ℓ(v) = 2v₁ + v₂。它的等值集 {v : ℓ(v) = c} 是一族间距相等的平行直线（c = …,−1,0,1,2,…）。ℓ(v) 等于 v 穿过多少条线。
  - 边界：
    - dim V* = dim V。证明：取 V 的基 e₁,…,e_d，定义对偶基 e^i(e_j) = δ_ij。任一 ℓ 由它在基上的取值确定，ℓ = Σ ℓ(e_i)e^i，所以 e^i 张成 V*；若 Σ c_i e^i = 0，作用在 e_j 上得 c_j = 0，所以线性无关。
    - V 与 V* 维数相同，但没有"自然"的对应：从等值线束里挑一个"垂直于线"的箭头，需要知道什么叫垂直，也就是需要内积。
  - 用途：c04 的 Riesz 定理正是用内积把余向量变成向量。
- proof_steps：
  1. V* 是向量空间：(ℓ₁+ℓ₂)(v) := ℓ₁(v)+ℓ₂(v)，(αℓ)(v) := αℓ(v)，二者仍线性。
  2. 对偶基：给定基 {e_j}，令 e^i 为满足 e^i(e_j) = δ_ij 的线性泛函（线性映射由基上的取值唯一确定）。
  3. 张成：对任意 ℓ ∈ V* 与 v = Σ v_j e_j，ℓ(v) = Σ v_j ℓ(e_j) = Σ ℓ(e_j) e^j(v)，所以 ℓ = Σ ℓ(e_j) e^j。
  4. 线性无关：若 Σ c_i e^i = 0，作用在 e_j 上得 c_j = 0。
  5. 所以 dim V* = d = dim V。对 f: M → ℝ，df_x ∈ (T_xM)*，且 dim (T_xM)* = n−k。
- necessity：
  - "把 df_x 当作步进方向"在类型上不成立：x + df_x 没有意义，df_x 是函数，不是 T_xM 中的元素。
  - 在等值线束中选"最陡"的箭头存在歧义。同一束平行线，若"长度"的量法不同（单位圆换成椭圆），使 ℓ 增长最快的单位方向不同（c05 给出具体计算）。所以从 df_x 到方向，还缺一样结构。
- visual_events：
  - e1｜"df_x eats a direction and returns a number"｜c02 的切平面被摘出，平铺为左侧 2D 坐标系，与球上的切平面用细线相连｜一个箭头 v 旋转一周，旁边读数 df_x[v] 随之变化（正弦形）｜球缩小到左上角｜读数停在某个值
  - e2｜"Linear functionals form the dual space"｜公式区 V* = {ℓ: V→ℝ linear}，(T_xM)* ∋ df_x｜逐项出现｜2D 平面保留｜ledger 写入 V* 定义
  - e3｜"Picture a covector as a stack of level lines"｜2D 平面上一族琥珀色平行线，标注 ℓ = −1, 0, 1, 2｜线束从 ℓ = 0 那条线出发，逐条铺开；箭头 v 穿过的线被高亮计数｜—｜标注 "ℓ(v) = number of lines crossed"
  - e4｜"Same dimension: the dual basis"｜基向量 e₁、e₂（青色）与对偶基 e¹、e²，后者画成竖直线束与水平线束｜两族线束先分别显示，再叠加组合成 ℓ = 2e¹ + e²｜—｜ledger：dim V* = dim V
  - e5｜"But a stack of lines is not an arrow"｜在线束上试画三个"候选最陡方向"的箭头（分别垂直于线、偏左、偏右），旁边问号｜三个箭头都闪烁，没有一个被选中｜线束保留｜标注 "perpendicular? needs an inner product"
- outcome_check：给出 ℓ(v) = 2v₁ + v₂，观众能画出它的等值线束，能说出它是 V* 的元素，并说出它不是向量的理由。
- source：HW p13（df_x ∈ T_x(X)*）、HW p14（Recall: dual space, dual functionals）。对偶基证明与等值线束图像为补充。
- next：内积能给出"垂直"，从而把余向量换成唯一的向量，这就是 Riesz 表示定理。

### c04-riesz — Riesz 表示定理：内积把余向量变成向量

- question：观众能陈述并完整证明有限维 Riesz 表示定理，并能指出证明在哪一步用到了正定性。
- requires：dual-space（c03）、euclidean-inner-product（受众已知）、rank-nullity（E05）。
- music：proof
- teaching_sequence：
  - 直觉：内积 ⟨u,·⟩ 本身就是一个余向量，即"沿 u 方向的投影量"。Riesz 说：反过来，每一个余向量都恰好是某个 u 的投影量。
  - 定义：内积 ⟨·,·⟩: V×V → ℝ 双线性、对称、正定（⟨v,v⟩ > 0，v ≠ 0）。
  - 定理（HW p14）：V 为有限维实向量空间，带内积 ⟨·,·⟩，则 Φ: V → V*，Φ(u) = ⟨u,·⟩ 是线性同构。即对每个 ℓ ∈ V*，存在唯一 u_ℓ ∈ V 使 ℓ(v) = ⟨u_ℓ, v⟩ 对所有 v 成立。记 u_ℓ = ℓ^♯。
  - 例子：标准内积下 ℓ(v) = 2v₁ + v₂，ℓ^♯ = (2,1)。显式公式：取规范正交基 {e_i}，ℓ^♯ = Σ ℓ(e_i) e_i。
  - 边界：
    - 正定性不可缺：若用退化的"内积" b(u,v) = u₁v₁，则 b(e₂, ·) = 0，Φ 不单射，ℓ(v) = v₂ 无法表示成 b(u,·)。
    - 有限维在本证明中用于"单射 ⇒ 满射"；无穷维情形需要另外的完备性假设，本课程不需要。
  - 用途：c06 中令 V = T_xM、内积为 g_x，得到 grad f(x) = (df_x)^♯。
- proof_steps：
  1. Φ(u) ∈ V*：v ↦ ⟨u,v⟩ 关于 v 线性（双线性的第二个变量）。
  2. Φ 线性：Φ(αu + βw)(v) = ⟨αu+βw, v⟩ = α⟨u,v⟩ + β⟨w,v⟩ = (αΦ(u) + βΦ(w))(v)。
  3. Φ 单射：若 Φ(u) = 0（零泛函），把它作用在 v = u 上，得 ⟨u,u⟩ = 0；由正定性 u = 0。所以 ker Φ = {0}。
  4. Φ 满射：由秩–零化度，dim im Φ = dim V − dim ker Φ = dim V = dim V*（c03）。im Φ 是 V* 中维数等于 dim V* 的子空间，所以 im Φ = V*。
  5. 结论：Φ 是线性双射，即同构。对每个 ℓ 存在唯一 u_ℓ = Φ⁻¹(ℓ)，使 ℓ = ⟨u_ℓ,·⟩。
  6. 显式公式：设 {e_i} 是规范正交基，令 u = Σ ℓ(e_i)e_i，则 ⟨u, e_j⟩ = ℓ(e_j) 对每个 j 成立；两个线性泛函在基上相等，所以处处相等。由唯一性 u = ℓ^♯。
- necessity：
  - 退化双线性型 b(u,v) = u₁v₁（半正定）：第 3 步失效，b(e₂,e₂) = 0 但 e₂ ≠ 0。Φ_b 的像只包含 "ℓ(v) = c·v₁" 这一维，ℓ(v) = v₂ 没有代表元。动画：线束为水平线（ℓ = v₂），尝试用 b 找 u，所有候选 u 只能产生竖直线束，永远对不上。
  - 唯一性的意义：若 u, u' 都代表 ℓ，则 ⟨u − u', v⟩ = 0 对所有 v 成立，取 v = u − u' 得 u = u'。这同样只靠正定性。
- visual_events：
  - e1｜"An inner product turns a vector into a covector"｜2D 平面，向量 u（白色），它诱导的线束 ⟨u,·⟩ = c（琥珀色，垂直于 u）｜u 旋转、伸缩，线束随之转动、变疏或变密｜—｜u = (2,1) 对应线束 2v₁+v₂
  - e2｜"Riesz says every covector arises this way"｜公式区：Φ: V→V*, Φ(u)=⟨u,·⟩ is an isomorphism｜公式出现｜u 与线束保留｜ledger 写入定理陈述
  - e3｜"Step 1: Φ is linear"｜公式 Φ(αu+βw) = αΦ(u)+βΦ(w)；画面上 u、w 两束线叠加成 αu+βw 的线束｜线束相加动画｜—｜ledger：Φ linear
  - e4｜"Step 2: injective — feed u to its own covector"｜Φ(u)=0 ⇒ Φ(u)(u) = ⟨u,u⟩ = 0 ⇒ u = 0；画面上 u 越来越短直到消失，线束间距同步趋于无穷｜—｜—｜"positive definite" 一词高亮；ledger：ker Φ = {0}
  - e5｜"Step 3: dimensions force surjectivity"｜两个方框 V（dim d）与 V*（dim d），一个箭头 Φ；秩–零化度公式 dim im Φ = d − 0 = d｜im Φ 方框涨满 V* 方框｜—｜ledger：Φ onto
  - e6｜"Without positive definiteness, it breaks"｜b(u,v) = u₁v₁；目标线束为水平线 ℓ = v₂｜候选 u 在平面上扫动，它诱导的线束始终是竖直线，或在 u₁ = 0 时消失；e₂ 被标红，b(e₂,e₂)=0｜—｜标注 "v₂ has no representative"
  - e7｜"The vector is ℓ^♯ — the sharp of ℓ"｜规范正交基 e₁、e₂，ℓ(e₁)=2、ℓ(e₂)=1 的读数，组合成箭头 (2,1)｜箭头生长并与线束垂直｜—｜公式 ℓ^♯ = Σ ℓ(e_i)e_i
- outcome_check：观众能指出 Riesz 证明中三个必需的要素：线性（双线性）、单射（正定）、满射（有限维 + 秩–零化度），并能求出 ℓ(v) = 2v₁+v₂ 在标准内积下的 ℓ^♯ = (2,1)。
- source：HW p14（Riesz Representation Theory: Φ: X→X*, x ↦ ⟨x,·⟩ is an isomorphism）。证明、显式公式与退化反例为补充。
- next：ℓ^♯ 依赖于所选的内积。换一个内积会怎样？

### c05-metric-matters — 换一个内积，梯度就转了方向

- question：观众能用具体计算说明：同一个 df 在两种内积下给出两个不同的梯度向量，各自在自己的几何中"垂直于等值线"；因此黎曼梯度必须先选定度量。
- requires：riesz（c04）、dual-space（c03）。
- music：counterexample
- teaching_sequence：
  - 直觉："垂直"和"单位长度"都由内积决定。换内积，相当于换一把量方向的尺子。
  - 定义：A 为对称正定 2×2 矩阵，⟨u,v⟩_A := uᵀAv 是 ℝ² 上的内积（双线性、对称、uᵀAu > 0 对 u ≠ 0 成立）。
  - 例子：f(v) = v₁ + v₂，df[v] = v₁ + v₂，A = diag(4,1)。
    - 标准内积：grad f = (1,1)。
    - A-内积：要求 ⟨u, v⟩_A = uᵀAv = v₁ + v₂ 对所有 v 成立，即 Au = (1,1)ᵀ，所以 u = A⁻¹(1,1)ᵀ = (1/4, 1)。
    - 一般地 grad_A f = A⁻¹∇f。
  - 边界：
    - 两个向量都"垂直于"等值线 v₁+v₂ = c 的方向 w = (1,−1)：标准意义下 (1,1)·(1,−1) = 0；A 意义下 (1/4,1)·A·(1,−1)ᵀ = 1 − 1 = 0。
    - 在 A 的单位椭圆 {4v₁² + v₂² = 1} 上，使 df 最大的点正是 grad_A f 的方向，即等值线与椭圆的切点（c07 证明一般结论）。
  - 用途：c06 的黎曼梯度定义中，度量 g_x 不是装饰，而是定义的组成部分。
- proof_steps：
  1. ⟨·,·⟩_A 是内积：对称性来自 Aᵀ = A；双线性来自矩阵乘法；正定性来自 A 正定。
  2. 设 grad_A f 满足 ⟨grad_A f, v⟩_A = df[v] = ∇fᵀv，∀v。即 (grad_A f)ᵀAv = ∇fᵀv，∀v，所以 A·grad_A f = ∇f（Aᵀ=A），得 grad_A f = A⁻¹∇f。
  3. 代入数值：∇f = (1,1)，A⁻¹ = diag(1/4, 1)，grad_A f = (1/4, 1)。
  4. A-正交性验证：等值线方向 w = (1,−1)，⟨grad_A f, w⟩_A = (1/4)(4)(1) + (1)(1)(−1) = 0。
  5. 两个梯度不平行：(1,1) 与 (1/4,1) 的夹角约 31°，所以"梯度方向"随内积改变。
- necessity：这一章本身就是必要性论证。如果梯度只由 df 决定，那么同一个 df 只能有一个梯度，但计算给出了两个不同的向量。所以单独的 df 不足以确定梯度方向，必须指定内积。在流形上，每个切空间都要指定一个，这就是黎曼度量。
- visual_events：
  - e1｜"Take one covector and two rulers"｜2D 平面，琥珀色线束 v₁+v₂ = c；左右两个徽标：标准单位圆（白色）与 A 的单位椭圆 4v₁²+v₂² = 1（紫色）｜两个单位集先后出现在原点｜线束保留｜两把"尺子"并排
  - e2｜"With the usual inner product, the gradient is (1,1)"｜白色箭头 (1,1)，直角符号标在它与等值线之间｜箭头生长｜单位圆保留｜ledger：grad = (1,1)
  - e3｜"With ⟨u,v⟩_A, solve A·grad = ∇f"｜公式区 A u = (1,1)ᵀ ⇒ u = (1/4, 1)；紫色箭头 (1/4,1)｜紫色箭头生长，与白色箭头之间显示夹角 31°｜白箭头保留｜ledger：grad_A = A⁻¹∇f
  - e4｜"Each is perpendicular — in its own geometry"｜在原点附近把平面做线性变换 A^{1/2}（椭圆变成圆），紫色箭头在新坐标下与等值线成直角；再变换回来｜变换来回播放一次｜两个箭头保留｜直角符号同时出现在两个箭头上，各自颜色
  - e5｜"Steepest point on the unit ball"｜等值线 v₁+v₂ = c 从 c = 0 开始向外平移，分别与单位圆、单位椭圆首次相切｜切点分别标出，它们恰好落在白色箭头与紫色箭头的方向上｜—｜标注 "tangency = steepest unit direction"
  - e6｜"So a gradient needs a metric"｜ledger 写入结论：df alone does not fix a direction; choose g_x on every T_xM｜—｜画面淡出到球面｜—
- outcome_check：给出 A = diag(1,9)、f(v) = v₁+v₂，观众能算出 grad_A f = (1, 1/9)，并能说出它与 (1,1) 不同的原因。
- source：补充（非笔记内容）。依据 HW p14 的 Riesz 定理与 HW p15 的梯度定义构造的具体反例。
- next：在流形上，每个切空间都需要一个内积，而且要随点光滑变化，这就是黎曼度量。

### c06-riemannian-metric-gradient — 黎曼度量与黎曼梯度

- question：观众能写出黎曼度量与黎曼梯度的定义，能解释存在唯一性来自 Riesz，并能在 S² 上验证一个具体的 grad f。
- requires：riesz（c04）、metric-dependence（c05）、differential（c02）、tangent-kernel、sphere-tangent、orthogonal-tangent（E05）。
- music：definition
- teaching_sequence：
  - 直觉：在每个切平面上放一把尺子（内积），尺子随点光滑变化。
  - 定义：
    - 黎曼度量（HW p14）：光滑地给每个 x ∈ M 指定一个 T_xM 上的内积 g_x: T_xM × T_xM → ℝ。光滑的含义：对 M 上任意光滑切向量场 U、V，函数 x ↦ g_x(U(x), V(x)) 光滑。
    - 黎曼流形（HW p15）：带黎曼度量的光滑流形 (M, g)。
    - 黎曼梯度（HW p15）：f: M → ℝ 光滑，grad f(x) 是 T_xM 中满足 df_x[v] = g_x(grad f(x), v)，∀v ∈ T_xM 的唯一向量；简记 grad f(x) = (df_x)^♯。
  - 例子：
    - 嵌入子流形的自然度量（补充）：M ⊆ ℝⁿ，令 g_x(u,v) := uᵀv（u,v ∈ T_xM ⊆ ℝⁿ）。它是 ℝⁿ 内积在子空间上的限制，所以仍正定；对任意光滑切向量场，x ↦ U(x)ᵀV(x) 光滑。O(n) 上即 g_R(H,K) = tr(HᵀK)。
    - S² 上 f(x) = aᵀx（a = e₃ 时即高度函数）：由 c02 的延拓规则 df_x[v] = aᵀv。候选 u = a − (aᵀx)x。① u ∈ T_xS²：xᵀu = xᵀa − (aᵀx)(xᵀx) = 0。② 对 v ∈ x^⊥：uᵀv = aᵀv − (aᵀx)(xᵀv) = aᵀv = df_x[v]。由唯一性，grad f(x) = a − (aᵀx)x。
  - 边界：
    - grad f(x) 必须在 T_xM 中。欧氏梯度 ∇f̄(x) = a 一般不在 T_xS² 中，而且依赖于延拓（c02：f̄₂ 的梯度为 e₃ + 10x）。所以 ∇f̄ 本身不能作为 grad f。
    - 极点 x = ±e₃ 处 grad f = e₃ − (±1)(±e₃) = 0：高度函数在极点取极值，不存在下降方向，与直觉一致。
  - 用途：c07 证明 grad 是最速上升方向；c09 用它构造下降步。
- proof_steps：
  1. 存在唯一性：对固定的 x，T_xM 是有限维（dim = n−k）向量空间，g_x 是其上的内积，df_x ∈ (T_xM)*（c02、c03）。由 Riesz（c04），存在唯一 u ∈ T_xM 使 df_x = g_x(u,·)，记 grad f(x) := u。
  2. 嵌入度量正定：对 u ∈ T_xM，g_x(u,u) = uᵀu = ‖u‖² > 0（u ≠ 0）。对称与双线性继承自 ℝⁿ。
  3. S² 例子：验证上面 ① 和 ②，再由唯一性得出结论。
- necessity：
  - 若度量不随点光滑变化（例如在某条纬线上突然把尺子换成椭圆），grad f 会沿 M 跳变，后续光滑性论证失效。定义中的"光滑"正是为了排除这种情况。本条只作说明，不做证明。
  - 若把 ∇f̄(x) 当作梯度：它有法向分量（离开 M），并且换一个延拓就改变（c02 的 f̄₂）。画面并列 ∇f̄₁ = e₃、∇f̄₂ = e₃ + 10x 与唯一的 grad f。
- visual_events：
  - e1｜"Put a ruler on every tangent plane"｜S² 上 6 个不同点处的小切平面，每个上画单位圆（嵌入度量）｜单位圆逐个出现，随后一个点沿球面移动，其单位圆连续跟随｜—｜标注 g_x
  - e2｜"Definition: Riemannian metric and Riemannian manifold"｜公式区 x ↦ g_x: T_xM × T_xM → ℝ smooth；(M,g)｜逐行出现｜切平面保留｜ledger：Riemannian metric
  - e3｜"The gradient is the sharp of df_x"｜公式区 df_x[v] = g_x(grad f(x), v), ∀v ∈ T_xM；grad f(x) = (df_x)^♯｜在 x 的切平面上，琥珀色线束（df_x）收缩为一个白色箭头（grad）｜—｜ledger：grad exists & unique (Riesz)
  - e4｜"Example on the sphere: f = height"｜S²，颜色图 f = x₃，点 x，红色 e₃ 箭头，切平面｜e₃ 分解为切向 e₃ − x₃x（白色，标为 grad f）与法向 x₃x（红色虚线）｜—｜公式 grad f(x) = e₃ − (e₃ᵀx)x
  - e5｜"Check both conditions"｜公式区两行：xᵀu = 0 ✓；uᵀv = e₃ᵀv ∀v ⊥ x ✓｜两个对勾依次出现｜—｜—
  - e6｜"The gradient field over the sphere"｜在球面网格点上画出 grad f 小箭头场，全部指向北极方向并沿经线｜箭头场淡入；北极、南极处箭头长度为 0｜—｜标注 "zero at the poles"
  - e7｜"The Euclidean gradient is not the answer"｜在 x 处并排显示 ∇f̄₁ = e₃、∇f̄₂ = e₃ + 10x（红色，长且指向外），以及唯一的白色 grad f｜两个红色箭头投影到切平面，都落在白色箭头上｜—｜ledger：grad f ∈ T_xM, independent of extension
- outcome_check：观众能在 S² 上对 f(x) = aᵀx 写出 grad f(x) = a − (aᵀx)x，并逐条验证它满足定义（切向 + 表示 df_x）。
- source：HW p14（A Riemannian metric: smoothly-varying assignment x ↦ g_x）、HW p15（Riemannian manifold；gradient ∇f(x) 是唯一满足 df_x[v] = g_x(∇f(x), v) 的向量，∇f(x) = df_x^♯）。嵌入度量与 S² 的计算为补充例子。
- next：为什么叫"梯度"？它确实是最陡的方向吗？

### c07-steepest-ascent — 为什么是梯度：Cauchy–Schwarz 与最速上升

- question：观众能证明：在 g_x-单位切向量中，df_x[v] 在 v = grad f(x)/‖grad f(x)‖_x 处取最大值 ‖grad f(x)‖_x，在相反方向取最小值 −‖grad f(x)‖_x。
- requires：riemannian-gradient（c06）、riesz（c04）。
- music：proof
- teaching_sequence：
  - 直觉：df_x[v] = g_x(grad, v) 是 v 在 grad 方向上的"投影"乘以 ‖grad‖。投影最大的单位方向，就是与 grad 同向的那个。
  - 定理：Cauchy–Schwarz 不等式 |⟨u,v⟩| ≤ ‖u‖‖v‖，等号当且仅当 u、v 线性相关。本集给出完整证明，不作为已知引用，因为证明很短，并且直接说明了等号何时成立。
  - 推论：若 grad f(x) ≠ 0，则 max_{‖v‖_x = 1} df_x[v] = ‖grad f(x)‖_x，在 v* = grad/‖grad‖ 处取到；min = −‖grad f(x)‖_x，在 −v* 处取到。
  - 例子：c05 的 A-度量，单位集是椭圆，最大点落在 A⁻¹∇f 方向，与 c05 的切点一致。S² 上嵌入度量时单位集是切平面上的单位圆。
  - 边界：grad f(x) = 0 时 df_x ≡ 0，所有方向一阶变化率为 0，即临界点（如 S² 的极点）。
  - 用途：c09 中 −grad f 给出一阶下降最快的方向。
- proof_steps：
  1. Cauchy–Schwarz：若 v = 0，两边为 0。设 v ≠ 0，对任意实数 t，0 ≤ ‖u − tv‖² = ‖u‖² − 2t⟨u,v⟩ + t²‖v‖²。
  2. 取 t = ⟨u,v⟩/‖v‖²，得 0 ≤ ‖u‖² − ⟨u,v⟩²/‖v‖²，即 ⟨u,v⟩² ≤ ‖u‖²‖v‖²。
  3. 等号情形：等号成立 ⇔ ‖u − tv‖ = 0 ⇔ u = tv（由正定性），即 u、v 线性相关。
  4. 应用：对 ‖v‖_x = 1，df_x[v] = g_x(grad f(x), v) ≤ ‖grad f(x)‖_x·1。
  5. 取 v* = grad/‖grad‖：df_x[v*] = g_x(grad, grad)/‖grad‖ = ‖grad‖，上界取到。由第 3 步，等号要求 v 与 grad 平行，在单位向量且使值为正的条件下，最大点唯一。
  6. 同理 df_x[v] ≥ −‖grad‖，等号仅在 v = −v* 时成立。
- necessity：
  - "最陡"必须在固定长度下比较。若不限制 ‖v‖，df_x[v] 可以无界增大（v 放大 λ 倍，值也放大 λ 倍）。所以最速上升是关于"单位球"的命题，而单位球由度量决定，这又回到 c05。
  - 动画对比：同一线束，单位圆与单位椭圆给出不同的最优方向。
- visual_events：
  - e1｜"Compare all unit directions"｜x 处切平面摘出为 2D；单位圆（白色），grad 箭头；一根单位箭头 v 绕圆旋转｜旋转过程中右侧极坐标图描出 θ ↦ df_x[v(θ)] = ‖grad‖cos θ｜—｜曲线峰值对准 grad 方向
  - e2｜"Cauchy–Schwarz, from one square"｜公式区 0 ≤ ‖u − tv‖² = ‖u‖² − 2t⟨u,v⟩ + t²‖v‖²；右侧画 t ↦ ‖u−tv‖² 的抛物线（始终 ≥ 0）｜抛物线顶点标出 t* = ⟨u,v⟩/‖v‖²｜单位圆淡化｜ledger：|⟨u,v⟩| ≤ ‖u‖‖v‖
  - e3｜"Equality exactly when u is parallel to v"｜2D 中 u − t*v 的残差箭头（u 到 v 方向的垂线）｜v 转向 u 的方向，残差缩短为 0，抛物线顶点下移，接触 0｜—｜ledger：equality ⇔ parallel
  - e4｜"So the gradient direction wins"｜回到旋转箭头图，在 v* = grad/‖grad‖ 处定格，读数 = ‖grad‖；在 −v* 处读数 = −‖grad‖｜两个端点分别标注 "steepest ascent"、"steepest descent"｜极坐标曲线保留｜ledger：max = ‖grad‖ at v*
  - e5｜"Change the unit ball, change the winner"｜单位圆换成 A-椭圆，线束不变｜最优点沿椭圆滑到新的位置，与 c05 的紫色箭头方向重合｜—｜标注 "metric decides 'steepest'"
  - e6｜"At a critical point every direction is flat"｜S² 的北极，grad = 0；旋转箭头时读数恒为 0｜极坐标图收缩为原点｜—｜标注 "critical point"
- outcome_check：观众能写出 Cauchy–Schwarz 的两行证明，并据此说明为什么 −grad f(x)/‖grad f(x)‖ 是一阶下降最快的单位方向。
- source：补充（非笔记内容）。HW p15 的梯度定义为出发点。
- next：第一问已经解决：方向是 −grad f(x) ∈ T_xM。第二问：沿这个方向怎么走，才能留在 M 上？

### c08-retraction — Retraction：把切向量变成 M 上的一步

- question：观众能写出 retraction 的定义，能证明 γ(t) = R_x(tv) 满足 γ(0) = x、γ'(0) = v，并能用反例说明去掉任一条件会坏掉什么。
- requires：differential（c02）、tangent-by-curves（E05）、steepest-ascent（c07）。
- music：definition
- teaching_sequence：
  - 直觉：在切平面上沿 −grad 走一步，再"拉回"到 M 上。拉回的方式要满足：零步不动；起步时的方向和速度与切向量一致。
  - 定义（BD、HW p15）：光滑流形 M 在点 x ∈ M 处的 retraction 是光滑映射 R_x: T_xM → M，满足 (i) R_x(0) = x；(ii) d(R_x)_0: T_xM → T_xM 是恒等映射 id。
    - 关于 (ii) 的类型：T_xM 是向量空间，它在 0 处的切空间就是它自己，因为曲线 t ↦ tv 在 0 处的速度为 v。由 (i)，R_x(0) = x，所以 d(R_x)_0 把 T_0(T_xM) = T_xM 映到 T_xM。
    - 有些 retraction 只在 0 的一个邻域上有定义，本集的例子在整个 T_xM 上有定义。
  - 例子：c09 中的球面归一化。
  - 边界（必要性见下）：两个条件分别控制"起点"和"一阶行为"，对二阶及以上不作要求。所以不同的 retraction 在远处可以不同，在 0 附近一阶相同。
  - 用途：c09 中令 v = −grad f(x)，得到下降性质。
- proof_steps：
  1. 设 v ∈ T_xM，定义 c(t) = tv（T_xM 中的直线，c(0) = 0，c'(0) = v）与 γ(t) = R_x(tv) = (R_x∘c)(t)。
  2. γ(0) = R_x(0) = x，由 (i)。
  3. γ'(0) = (R_x∘c)'(0)。由 c02 中用曲线定义的微分（应用于光滑映射 R_x: T_xM → M、点 0、代表曲线 c），(R_x∘c)'(0) = d(R_x)_0[c'(0)] = d(R_x)_0[v]。
  4. 由 (ii)，d(R_x)_0[v] = v，所以 γ'(0) = v（HW p16 的计算）。
  5. 结论：每条 retraction 曲线 t ↦ R_x(tv) 都是 M 中过 x、速度为 v 的曲线。所以 c02 的定义可以直接把它当作代表曲线：(f∘γ)'(0) = df_x[v]。
- necessity：
  - 去掉 (i)：R̃_x(v) = R_x(v + w₀)，其中 w₀ ≠ 0 为固定切向量。零步也会跳到 R_x(w₀) ≠ x。无论步长多小，f 都可能增大，"小步下降"的保证消失。动画：步长滑块拉到 0，点仍然跳走。
  - 去掉 (ii)，例 1（速度错）：R̃_x(v) = (x + 2v)/‖x + 2v‖ 满足 (i)，但 d(R̃_x)_0 = 2·id。沿 −grad 的一阶变化率变为 −2‖grad‖²，c09 的一阶预测 f(x) − t‖grad‖² 错了一个因子 2。方向仍是下降方向，但"步长 t"与切向量长度的对应关系被破坏。
  - 去掉 (ii)，例 2（方向错）：在 S² 上，令 Q_θ 为 T_xS² 中旋转角 θ 的线性映射，R̃_x(v) = (x + Q_θv)/‖x + Q_θv‖。则 d(R̃_x)_0 = Q_θ，其中 Q_θv ∈ T_xS²，计算同 c09，并且 xᵀQ_θv = 0。沿 −grad 的一阶变化率为 df_x[Q_θ(−grad)] = −g_x(grad, Q_θ grad) = −‖grad‖² cos θ。θ = 90° 时一阶下降为 0；θ > 90° 时变成上升。动画：θ 拨盘从 0° 转到 180°，右侧斜率读数从 −‖grad‖² 变到 +‖grad‖²。
- visual_events：
  - e1｜"Second question: how to move"｜S²，颜色图，x，白色 −grad 箭头躺在切平面上｜红色虚线：直线 x − t·grad 离开球面，t 增大时红点离球面越来越远｜—｜标注 "x − t·grad ∉ M"
  - e2｜"Step in the tangent plane, then come back to M"｜切平面上的点 x − t·grad 通过一条细线被"拉回"到球面上的点｜拉回动画；球面上画出拉回点的轨迹（白色曲线）｜红色虚线保留（淡）｜白色曲线从 x 出发
  - e3｜"Definition: R_x(0) = x and d(R_x)_0 = id"｜公式区两行条件；右上角小图示：T_xM 中 0 的邻域映到 M 中 x 的邻域｜条件 (i)(ii) 逐行出现｜—｜ledger：retraction definition
  - e4｜"Why condition (ii) has the right type"｜T_xM 中的直线 c(t) = tv 与它在 0 处的速度 v；标注 T_0(T_xM) = T_xM｜—｜—｜—
  - e5｜"Proof: γ(t) = R_x(tv) starts at x with velocity v"｜公式区三行：γ(0) = R_x(0) = x；γ'(0) = d(R_x)_0[c'(0)] = d(R_x)_0[v] = v｜每个等号上方标出所用依据（(i)、c02 定义、(ii)）｜白色曲线保留，并在 x 处画出速度箭头，与 v 重合｜ledger：γ(0)=x, γ'(0)=v
  - e6｜"Drop (i): a zero step teleports"｜步长滑块 t；R̃_x(tv) = R_x(tv + w₀)｜滑块拉到 0，点仍停在 R_x(w₀)（红色），离开 x｜—｜标注 "R̃_x(0) ≠ x"
  - e7｜"Drop (ii): the curve leaves at the wrong speed or angle"｜三条从 x 出发的球面曲线：正确的 R_x(−t·grad)（白色）、速度加倍的 (x − 2t·grad)/‖·‖（橙色）、旋转 θ 的 R̃（红色）；θ 拨盘；右侧读数 slope = −‖grad‖² cos θ｜θ 从 0° 转到 180°，红色曲线绕 x 旋转，读数穿过 0 变正｜白色曲线保留｜θ = 90° 时停顿，标注 "no first-order decrease"
- outcome_check：观众能回答：条件 (ii) 保证了什么？（γ'(0) = v，所以 f 沿 retraction 曲线的初始变化率等于 df_x[v]。）并能举出一个满足 (i)、违反 (ii) 的映射，说出它在一阶上出了什么错。
- source：BD（"A retraction on a smooth manifold X at a point x ∈ X is a smooth map R_x: T_x(X) → X satisfying (i) R_x(0) = x (ii) d(R_x)_0 = id"）；HW p15（Restraction，γ(t) := R_x(tv)）；HW p16（γ̇(0) = d(R_x)_0[v] = v）。反例为补充。
- next：给出一个具体的 retraction，并把它和 −grad 合起来，证明下降。

### c09-sphere-retraction-descent — 球面归一化与下降性质

- question：观众能验证 R_x(v) = (x+v)/‖x+v‖ 是 S² 上的 retraction，并能完整推导 d/dt f(R_x(−t·grad f(x)))|₀ = −‖grad f(x)‖²_x，从而说明小步一定下降，除非 grad f(x) = 0。
- requires：retraction（c08）、riemannian-gradient（c06）、steepest-ascent（c07）、differential（c02）、sphere-tangent（E05）。
- music：proof
- teaching_sequence：
  - 直觉：在切平面里走一步，再把点"缩放"回单位球面，这是最朴素的拉回方式。
  - 例子（补充，非笔记内容）：S^{n−1} 上 R_x(v) = (x+v)/‖x+v‖，v ∈ T_xS^{n−1} = x^⊥。
  - 定理（BD）：设 R_x 为 x 处的 retraction，grad 关于 g_x 定义，φ(t) := f(R_x(−t·grad f(x)))，则 φ'(0) = −‖grad f(x)‖²_x。
  - 边界：
    - 这是一阶结论：只保证存在 t̄ > 0，使 0 < t < t̄ 时 φ(t) < φ(0)。它不告诉我们 t̄ 有多大，也不说明步长如何选取。这些属于下一个主题。
    - grad f(x) = 0 时 φ'(0) = 0，没有一阶下降。
  - 用途：两问合并。方向 −grad f(x)，移动 R_x。下一个主题将把它们组合成算法。
- proof_steps：
  1. 有定义且落在球面上：对 v ∈ x^⊥，‖x+v‖² = ‖x‖² + 2xᵀv + ‖v‖² = 1 + ‖v‖² ≥ 1 > 0，所以分母不为零；结果的范数为 1，所以 R_x(v) ∈ S^{n−1}。R_x 是光滑函数的商，分母不为零，所以光滑。
  2. 条件 (i)：R_x(0) = x/‖x‖ = x。
  3. 条件 (ii)：取 c(t) = tv，N(t) := ‖x + tv‖ = √(1 + t²‖v‖²)，N(0) = 1，N'(t) = t‖v‖²/√(1 + t²‖v‖²)，所以 N'(0) = 0。由商的求导法则，d/dt[(x+tv)/N(t)]|₀ = (v·N(0) − (x + 0·v)·N'(0))/N(0)² = v。所以 d(R_x)_0[v] = v，即 d(R_x)_0 = id。
  4. 下降性质，设定：令 v = −grad f(x) ∈ T_xM，γ(t) := R_x(tv)，φ(t) = f(γ(t))。
  5. 由 c08：γ(0) = x，γ'(0) = v = −grad f(x)。
  6. 由 c02 微分的曲线定义：φ'(0) = (f∘γ)'(0) = df_x[γ'(0)] = df_x[−grad f(x)]。
  7. 由 c02 的线性：= −df_x[grad f(x)]。
  8. 由 c06 梯度定义（取 v = grad f(x)）：= −g_x(grad f(x), grad f(x)) = −‖grad f(x)‖²_x。
  9. 结论：若 grad f(x) ≠ 0，则 φ'(0) < 0（正定性）。由导数定义，(φ(t) − φ(0))/t → φ'(0) < 0（t → 0⁺），所以存在 t̄ > 0，使 0 < t < t̄ 时 φ(t) < φ(0)。
  10. 数值核对（S²，f = x₃）：grad f(x) = e₃ − x₃x，‖grad f(x)‖² = 1 − x₃²。动画右侧 φ(t) 曲线在 t = 0 处的切线斜率读数等于 −(1 − x₃²)。
- necessity：
  - 若用 c08 中违反 (ii) 的映射替换 R_x，第 5 步 γ'(0) = v 失效，第 6 步得到的就不再是 df_x[−grad]，斜率变为 −2‖grad‖² 或 −‖grad‖² cos θ。所以下降结论依赖条件 (ii)。
  - 若用欧氏梯度 ∇f̄ 代替 grad：−∇f̄ 不在 T_xM 中，R_x(−t∇f̄) 在定义上就不合法（R_x 的定义域是 T_xM）。即使先把它投影到 T_xM，若没有 c06 的定义，也无法把第 8 步写成 −‖·‖²。
- visual_events：
  - e1｜"Normalize: step, then rescale to the sphere"｜S²，x，切平面上的 x+v（白点），一条从原点出发的射线穿过 x+v 并交球面于 R_x(v)｜v 变化，射线扫动，交点在球面上移动｜—｜公式 R_x(v) = (x+v)/‖x+v‖
  - e2｜"It is defined everywhere: ‖x+v‖² = 1 + ‖v‖²"｜直角三角形：x（长 1）、v（⊥ x）、斜边 x+v｜三角形高亮，勾股公式出现｜—｜ledger：R_x(v) ∈ S^{n−1}
  - e3｜"Check (i) and (ii)"｜公式区：R_x(0) = x；N(t) = √(1+t²‖v‖²)，N'(0) = 0；d/dt(...)|₀ = v｜右侧小图 t ↦ N(t)，在 t = 0 处切线水平｜—｜ledger：sphere retraction ✓
  - e4｜"Now combine: direction −grad, move by R_x"｜S²，颜色图 f = x₃，−grad 箭头，白色曲线 γ(t) = R_x(−t·grad)，红色虚线直线步（淡）｜点沿白色曲线向下移动，颜色变冷｜—｜点停在 t = 0.4 处
  - e5｜"Differentiate f along the retracted curve"｜公式区按 proof_steps 6–8 逐行推导，每行左侧标注依据：curve definition / linearity / gradient definition｜每行出现时，对应依据的 ledger 条目闪烁一次｜白色曲线保留｜终式 φ'(0) = −‖grad f(x)‖²_x 加框
  - e6｜"Slope matches the prediction"｜右侧图 t ↦ φ(t) = f(R_x(−t·grad))，t = 0 处切线，读数 slope = −(1 − x₃²)｜切线与曲线在 0 附近贴合，远处分离｜—｜标注 "first order only"
  - e7｜"Small steps decrease f — unless grad f = 0"｜x 移到北极附近，箭头缩短，切线斜率趋于 0｜—｜—｜ledger：φ'(0) < 0 ⇔ grad f(x) ≠ 0
- outcome_check：观众能不看画面写出 φ'(0) = −‖grad f(x)‖²_x 的四步推导，每步说出依据（retraction 条件 (ii)、微分的曲线定义、线性、梯度定义）。
- source：BD（df_x[−grad f(x)] = −g_x(grad f(x), grad f(x)) = −‖grad f(x)‖²_x 板书，在 retraction 板书左侧）；HW p15–16（γ(t) := R_x(tv)，γ̇(0) = v）。球面归一化 retraction 与数值核对为补充例子。
- next：全系列回顾。

### c10-series-recap — 回顾：从开集到一步下降

- question：观众能沿依赖链说出每一集为下一集提供了什么，并能指出 "−grad f(x)" 与 "R_x" 各自依赖哪些前置概念。
- requires：本集全部章节；E01–E05。
- music：recap
- teaching_sequence：
  - 直觉：回顾知识树，从下往上逐层点亮。
  - 定义：无新定义。
  - 例子：最后一个画面是 S² 上的一步，x → R_x(−t·grad f(x))，这是全系列所有工具同时出现的地方。
  - 边界：本系列在此停在课程当前进度：retraction 的定义与下降性质。步长选择、迭代算法与收敛性尚未讲到。
  - 用途：最后一句点名下一个主题，即 Riemannian gradient descent。
- proof_steps：无
- necessity：回顾每一层"为什么需要"的一句话：
  - 拓扑：没有坐标也能谈"附近"与连续。
  - chart / 光滑图册：能在 M 上做微积分，并且"光滑"不依赖坐标。
  - 反函数定理 → 隐函数定理 → 正则水平集：不用手造 chart，就能证明方程定义的集合是流形。
  - T_xM = ker Dh：合法方向的集合可以计算。
  - df_x、Riesz、度量：把"f 怎样变化"变成一个方向。
  - retraction：让这个方向变成 M 上的一个点。
- visual_events：
  - e1｜"Let's climb the tree once more"｜docs/knowledge-map.md 的依赖树，以节点图形式全屏显示，底部为 E01 拓扑，顶部为 retraction / grad｜节点按 E01 → E06 自下而上逐层点亮，每层旁边出现一句"why"｜—｜整棵树点亮
  - e2｜"Two branches meet at one step"｜树顶两个分支高亮：grad f（左，依赖 df_x、Riesz、g_x、T_xM）与 R_x（右，依赖 T_xM、df_x）｜分支汇合到节点 "x ↦ R_x(−t·grad f(x))"｜树保留（淡）｜汇合节点发光
  - e3｜"Back on the sphere"｜S²，颜色图，x，−grad 箭头，白色 retraction 曲线，切平面｜点沿曲线走一步｜—｜画面定格
  - e4｜"Next: turn one step into an algorithm"｜屏幕中央文字 "Next: Riemannian gradient descent"｜淡入｜球面保留（淡）｜结束
- outcome_check：观众能指着树回答：grad f(x) 为什么需要 Riesz？R_x 为什么需要 T_xM？
- source：docs/knowledge-map.md；各集来源见对应分镜。
- next：系列下一集（课程扩展后）：Riemannian gradient descent。

## Glossary additions

| id | en | zh | symbol | spoken |
|---|---|---|---|---|
| inner-product | inner product | 内积 | ⟨u, v⟩ | inner product |
| covector | linear functional (covector) | 线性泛函（余向量） | ℓ ∈ V^* | covector |
| dual-basis | dual basis | 对偶基 | e^i | dual basis |
| sharp-map | sharp map (index raising) | 升号映射（♯） | ℓ^♯ | sharp |
| cauchy-schwarz | Cauchy–Schwarz inequality | 柯西–施瓦茨不等式 | \|⟨u,v⟩\| ≤ ‖u‖‖v‖ | Cauchy Schwarz inequality |
| steepest-ascent | steepest ascent direction | 最速上升方向 | grad f / ‖grad f‖ | steepest ascent direction |
| critical-point | critical point | 临界点 | grad f(x) = 0 | critical point |
| descent-property | first-order descent property | 一阶下降性质 | −‖grad f(x)‖²_x | descent property |
| chain-rule | chain rule | 链式法则 | D(F∘G) = DF·DG | chain rule |

chain-rule 可能已由 E03 分镜提出，合并时去重。

## 估计时长

| 章 | 估计分钟 |
|---|---|
| c01-two-questions | 3.0 |
| c02-differential-by-curves | 5.0 |
| c03-covector-not-direction | 3.5 |
| c04-riesz | 4.0 |
| c05-metric-matters | 3.5 |
| c06-riemannian-metric-gradient | 4.5 |
| c07-steepest-ascent | 3.5 |
| c08-retraction | 4.5 |
| c09-sphere-retraction-descent | 4.5 |
| c10-series-recap | 2.5 |
| 合计 | 约 38.5 |
