# E08 — Connections, Geodesics and Parallel Transport

## 全集框架

- 核心问题：二阶方法需要对向量场（例如梯度场）求导，但流形上不同点的切向量住在不同的切空间里，不能直接相减。本集给出向量场在流形上的导数——联络 ∇；说明要求哪两条性质（与度量相容、无挠）后联络唯一（Levi-Civita），子流形上它就是"欧氏导数再投影"；再用它定义加速度为零的曲线（测地线）、沿测地线走的指数映射、沿曲线搬运切向量的平行移动。
- 来源：课程笔记 `notes/08/笔记 2026年9月15日(2).pdf` 第 25–30 页与板书照片（下文记作"讲义"）；Boumal, *An Introduction to Optimization on Smooth Manifolds*（2023）§5.1–5.8、§5.10、§10.2–10.3（记作 BM）。Christoffel 符号与测地线方程的坐标形式来自讲义（BM 不用坐标）。标"补充"的例子不在两者之中，均已数值核对。
- 受众起点：E02 光滑流形、chart、坐标；E03 链式法则、二阶偏导对称、ODE 解的存在唯一（压缩映射，Picard）；E05 切空间、T_xS² = x^⊥、曲线速度；E06 微分 df_x、Riesz、黎曼度量与梯度、retraction、球面归一化 retraction；E07 RGD、拉回 f̂_x、Proj_x = I − Jᵀ(JJᵀ)⁻¹J、球面 Proj_x = I − xxᵀ、瑞利商。不假定见过向量场作用于函数、李括号、联络。
- 主线：圆的速度场求导失败 → 向量场作用在函数上、李括号 → 联络的三条公理 → 坐标与 Christoffel 符号 → 与度量相容、无挠及其反例 → 基本定理与 Koszul 公式 → 子流形：投影欧氏导数 → 曲线上的协变导数与测地线 → 指数映射 → 平行移动 → 回顾与黎曼 Hessian 预告。
- 贯穿例子：
  - S¹ ⊂ ℝ²，γ(t) = (cos t, sin t)，γ̇ = (−sin t, cos t)，γ̈ = −γ（法向）。
  - S² ⊂ ℝ³ 嵌入度量，∇_u V = Proj_x(DV̄(x)[u])，Proj_x = I − xxᵀ。旋转场 V(x) = e₃ × x。
  - ℝ² 极坐标：E_r = (cos θ, sin θ)，E_θ = (−r sin θ, r cos θ)，Γ^r_θθ = −r，Γ^θ_rθ = Γ^θ_θr = 1/r，其余为 0。
  - 纬线圈（极角 θ）：单位角速度时切向加速度大小 sin θ cos θ，指向极点；赤道为 0。
  - 八分之一球面三角形 N → e₁ → e₂ → N：平行移动一圈，向量转 90°，长度不变。
- 内容依赖：

| content_id | 内容 | 前置 | 建立位置 |
|---|---|---|---|
| chart-coordinates | 局部坐标 (x¹,…,xⁿ)，坐标向量场 ∂/∂xⁱ | smooth-manifold | E02 |
| chain-rule-symmetry | 链式法则；二阶偏导对称 | — | E03 |
| ode-existence | 光滑 ODE 初值问题局部存在唯一 | contraction-mapping | E03 |
| tangent-space | T_xM；T_xS² = x^⊥；曲线速度 | — | E05 |
| riemannian-metric | ⟨·,·⟩_x 光滑变化；Riesz | — | E06 |
| retraction | R_x(0) = x，DR_x(0) = id；归一化 retraction | tangent-space | E06 |
| projector | Proj_x，球面 I − xxᵀ；子流形梯度 = 投影欧氏梯度 | riemannian-metric | E07 |
| hessian-need | Newton 需要梯度场的导数 | — | E07 c10 |
| vector-field-derivation | X f = Df[X]；[X,Y] f = X(Y f) − Y(X f) | tangent-space | c02 |
| lie-bracket-field | [X,Y] 是向量场；ℝⁿ 中 [X,Y] = DY[X] − DX[Y]；坐标场对易 | chain-rule-symmetry | c02 |
| affine-connection | ∇: 𝔛×𝔛→𝔛，对方向 C^∞ 线性、对被求导场 ℝ 线性、Leibniz | vector-field-derivation | c03 |
| christoffel | ∇_{E_i}E_j = Γ^k_ij E_k；∇_X Y = (X(Y^k) + Γ^k_ij XⁱY^j)E_k | affine-connection、chart-coordinates | c04 |
| compatibility | X⟨Y,Z⟩ = ⟨∇_X Y,Z⟩ + ⟨Y,∇_X Z⟩ | affine-connection、riemannian-metric | c05 |
| torsion-free | ∇_X Y − ∇_Y X = [X,Y]；坐标中 ⇔ Γ^k_ij = Γ^k_ji | lie-bracket-field、christoffel | c05 |
| fundamental-theorem | 存在唯一的相容无挠联络；Koszul 公式 | compatibility、torsion-free、riemannian-metric | c06 |
| submanifold-connection | ∇_v X = Proj_x(DX̄(x)[v]) 是 Levi-Civita 联络 | projector、fundamental-theorem | c07 |
| covariant-along-curve | D/dt Z = Proj(Ż)；加速度 γ'' = D/dt γ̇ | submanifold-connection | c08 |
| geodesic | γ'' = 0；坐标 ẍ^k + Γ^k_ij ẋⁱẋ^j = 0；给定 (x, v) 唯一 | covariant-along-curve、christoffel、ode-existence | c08 |
| exponential-map | Exp_x(tv) = γ_v(t)；球面公式；二阶 retraction | geodesic、retraction | c09 |
| parallel-transport | D/dt Z = 0；Π_γ 线性等距；依赖路径 | covariant-along-curve、compatibility | c10 |
| hessian-preview | Hess f(x)[u] = ∇_u grad f | submanifold-connection | c11 |

- 本集使用的术语：tangent-space、riemannian-metric、riemannian-gradient、retraction、orthogonal-projector、chart、smooth-extension、exponential-map、riemannian-hessian；新增术语见文末。

### 笔记识读

| 位置 | 笔记原文 | 采用的读法 | 依据 |
|---|---|---|---|
| p.25 | "what is the dimensions of this vector field?" | "what is the derivative of this vector field?"（速度场的导数，即加速度） | 下一行"Let's try the obvious thing: γ̈ = …" |
| p.25 | ∇: 𝔛(M)×𝔛(M)→𝔛(M) "smooth function f, g ∈ C^∞(M)" | 公理中出现的 f, g 是光滑函数 | p.26 公理 (i)(iii) |
| p.26 | "(ii) ℝ-linearity in field being =" | "ℝ-linearity in the field being differentiated" | BM 性质 2 |
| p.26 | "(i) C^∞-linearity in direction" | 对方向场 C^∞(M) 线性：∇_{fX+gY}Z = f∇_X Z + g∇_Y Z | 讲义与 BM Def 5.20 |
| p.28 | "Fund mtd The Remannian Geometry" | Fundamental Theorem of Riemannian Geometry | 板书照片 |
| p.28 | "Riemannian Connection of smooth manifold of Eclir space" | Riemannian connection of submanifolds of Euclidean space | BM Thm 5.9 |
| p.28 | "M ⊆ ℝⁿ with inherent metric" | induced (embedded) metric | BM Thm 5.9 |
| p.28 | "its (Cmlgnt) differential DX̄(p)[v]" | its ordinary (Euclidean) differential | X̄ 定义在 ℝⁿ 的开集上 |
| p.29 | ∇_v X = Proj_x(DX̄(p)[v]) | 投影应在点 p：Proj_p | 下标 x 与 p 混用 |
| p.30 | "Geodesics devirited by γ_v(0)=x, γ̇_v(0)=v" | geodesics determined by γ_v(0) = x, γ̇_v(0) = v | ODE 唯一性 |
| 照片 | torsion-free 旁注 | "Roughly speaking, this measures 'noncommutativity' of partial differentiation" | 照片 eb13 |
| 照片 | "NB: In coordinates, ∇ is t.f. iff Γ^k_ij = Γ^k_ji ∀ i,j ∈ [n]" | 同左 | 照片 0f15 |

### 全集画面约定

- 3D 主舞台：单位球 S² 半透明蓝，切平面半透明绿；切向量绿色，法向分量红色虚线，欧氏导数红色实线箭头，投影后的协变导数黄色。
- 2D 舞台：正交相机，坐标网格灰；向量场为小箭头阵列（蓝），积分曲线白色细线。
- 证明账本：右侧 x ≥ 1400，短标签；字幕区 y ≥ 860 不放图形。
- 配色：已建立的事实绿色；反例红色；第二个联络紫色；强调公式黄色。

## 章节

### c01-why-new-derivative — 圆的速度场：为什么需要新的导数

- question：观众能说出"速度场的欧氏导数离开切空间"和"差商里相减的两个向量不在同一个切空间"这两个事实，并说出这为什么挡住了二阶方法。
- requires：tangent-space（E05）、hessian-need（E07）。
- music：motivation
- teaching_sequence：
  - 动机：Newton 方法要解 Hess f(x)[s] = −grad f(x)，Hessian 是梯度场的导数。先问：流形上怎样对向量场求导？
  - 例子（讲义 p.25）：γ(t) = (cos t, sin t)，γ̇(t) = (−sin t, cos t) ∈ T_{γ(t)}S¹。"显然的做法"γ̈(t) = lim (γ̇(t+h) − γ̇(t))/h = (−cos t, −sin t) = −γ(t)：指向圆心，与切线垂直，不在 T_{γ(t)}S¹ 里。
  - 原因：γ̇(t+h) ∈ T_{γ(t+h)}S¹，γ̇(t) ∈ T_{γ(t)}S¹，在流形内在地看，两者属于不同的向量空间；在 ℝ² 里能相减，但结果没有理由落在切空间。
  - 第二个例子（BM §5.1，(5.1)）：S² 上瑞利商梯度场 V(x) = Ax − (xᵀAx)x（E07），DV(x)[u] = Proj_x(Au) − (xᵀAx)u − (uᵀAx)x，第三项是法向的，uᵀAx ≠ 0 时 DV(x)[u] 不切；若拿它当 Hessian，⟨Hess f(x)[u], u⟩ 没有意义。
  - 路线：像 BM §5.2 那样先列出欧氏导数满足的性质，把它们当作公理（c03），再要求与度量配合（c05–c06）。
- proof_steps：
  1. γ̇(t) = (−sin t, cos t)，⟨γ̇, γ⟩ = 0，所以 γ̇ ∈ T_{γ(t)}S¹ = γ(t)^⊥。
  2. γ̈(t) = (−cos t, −sin t) = −γ(t)，⟨γ̈, γ⟩ = −1 ≠ 0，所以 γ̈ ∉ T_{γ(t)}S¹。
  3. (5.1)：V̄(x) = Ax − (xᵀAx)x 是 V 的延拓；DV̄(x)[u] = Au − (xᵀAx)u − (uᵀAx + xᵀAu)x = Proj_x(Au) − (xᵀAx)u − (uᵀAx)x（用 A 对称、xᵀu = 0）。
- necessity：
  - 若把 γ̈ 投影回切线，得到 0：圆以恒定速率绕行，"内在加速度"应为零——这正是 c07–c08 的答案（预告）。
- visual_events：
  - e1｜"Newton needs a derivative of a vector field"｜标题行：Hess f(x)[s] = −grad f(x)｜—｜—｜—
  - e2｜"The circle's velocity field"｜S¹，点沿圆转动，速度箭头（绿）随之转动；每个点上画出切线｜—｜—｜ledger：γ̇ ∈ T_γS¹
  - e3｜"The obvious derivative"｜相邻两点的速度箭头平移到同一起点，差向量（红）指向圆心；γ̈ = −γ｜差除以 h，h → 0 时收敛到 −γ｜—｜ledger：γ̈ ⊥ T_γS¹
  - e4｜"Different tangent spaces"｜两条切线（不同角度）各自带着自己的向量；中间打问号｜—｜—｜—
  - e5｜"On the sphere too"｜S²，梯度场箭头；某点 DV[u] 分解为切向（绿）与法向（红虚）｜—｜—｜(5.1)
- outcome_check：观众能解释为什么 γ̈ 不能直接当作 S¹ 上曲线的加速度。
- source：讲义 p.25；BM §5.1 (5.1)、§5.2。
- next：先弄清向量场怎样作用在函数上。

### c02-vector-fields-brackets — 向量场作用于函数；李括号

- question：观众能计算 X f 与 [X,Y] f，知道 [X,Y] 是向量场、在 ℝⁿ 中等于 DY[X] − DX[Y]，并能解释它度量"先沿 X 后沿 Y"与"先沿 Y 后沿 X"的差。
- requires：tangent-space、chain-rule-symmetry。
- music：definition
- teaching_sequence：
  - 定义（BM Def 5.5，讲义照片）：X f(x) = Df(x)[X(x)]，把函数变成函数；⟨X,Y⟩(x) = ⟨X(x),Y(x)⟩_x。
  - 李括号：[X,Y] f = X(Y f) − Y(X f)。
  - 二阶项抵消：ℝⁿ 中 X(Y f) = Xⁱ∂_i(Y^j ∂_j f) = Xⁱ(∂_i Y^j)∂_j f + XⁱY^j ∂_i∂_j f；减去对调项，二阶偏导对称（E03）使 XⁱY^j∂_i∂_j f − Y^jXⁱ∂_j∂_i f = 0，剩下 (X(Y^j) − Y(X^j))∂_j f：[X,Y] 只用一阶导数作用于 f，所以是一个向量场，[X,Y] = DY[X] − DX[Y]（BM Prop 5.10 的欧氏情形）。
  - 例子（BM 脚注 1）：U = (1,0)，V = (0, x₁x₂)，f(x) = x₂：V f = x₁x₂，U(V f) = x₂，U f = 0，[U,V] f = x₂ = f；[U,V] = (0, x₂)。
  - 几何（补充）：从 p = (1,1) 出发，沿 U 的流走 ε 再沿 V 的流走 ε，与先 V 后 U 相比，终点差 ≈ ε²[U,V](p) = ε²(0,1)；数值：差/ε² = 1.246、1.111、1.053、1.026（ε = 0.2, 0.1, 0.05, 0.025）。
  - 坐标场对易：[∂_i, ∂_j] = 0（同样因为二阶偏导对称）。讲义旁注："roughly speaking, this measures 'noncommutativity' of partial differentiation"。
- proof_steps：上面的展开；两条流的终点 (1+ε, e^{(1+ε)ε}) 与 (1+ε, e^ε)。
- necessity：
  - 单独的 X(Y f) 含二阶导数，不是向量场（例：X = Y = ∂_x，X(X f) = f_xx，不能写成 Df[某个向量]）；只有差才是。
- visual_events：
  - e1｜"Fields act on functions"｜ℝ² 上 f 的等值线，向量场箭头，X f 用颜色显示｜—｜—｜ledger：X f = Df[X]
  - e2｜"Second derivatives cancel"｜展开四项，二阶项一对划掉｜—｜—｜ledger：[X,Y] = DY[X] − DX[Y]
  - e3｜"Example"｜U、V 的箭头阵列；[U,V] = (0, x₂)｜—｜—｜—
  - e4｜"The flow square"｜从 p 出发两条折线（橙、紫），终点间小缺口（红）；ε 减半，缺口按 ε² 缩小；读数表｜—｜—｜gap/ε² → 1
  - e5｜"Coordinate fields commute"｜网格线上 ∂_x、∂_y 箭头；方块闭合｜—｜—｜[∂_i,∂_j] = 0
- outcome_check：给 X = (y, 0)，Y = (0, x)，观众能算出 [X,Y] = (−x, y)。（补充：DY[X] = (0, y)，DX[Y] = (x, 0)。）
- source：BM Def 5.5、脚注 1、Prop 5.10；讲义照片。缺口数值为补充。
- next：用这些作用定义"向量场沿向量场的导数"。

### c03-affine-connections — 联络的三条公理

- question：观众能写出仿射联络的三条公理，说出每条从欧氏导数的哪条性质来，并知道联络有无穷多个。
- requires：vector-field-derivation。
- music：definition
- teaching_sequence：
  - 欧氏导数的性质（BM §5.2）：D(V)(x)[au + bw] 线性；D(aV + bW) 线性；D(fV)[u] = Df[u]V + f DV[u]。
  - 定义（讲义 p.25–26；BM Def 5.20）：仿射联络 ∇: 𝔛(M) × 𝔛(M) → 𝔛(M)，(X, Y) ↦ ∇_X Y，对所有 X,Y,Z、f,g ∈ C^∞(M)、a,b ∈ ℝ：
    (i) 对方向 C^∞ 线性：∇_{fX+gY} Z = f∇_X Z + g∇_Y Z；
    (ii) 对被求导场 ℝ 线性：∇_X(aY + bZ) = a∇_X Y + b∇_X Z；
    (iii) Leibniz：∇_X(fY) = f∇_X Y + (X f)Y。
  - (i) 的意义：系数可以是函数，所以 (∇_X Y)(p) 只依赖 X(p)，可以写 ∇_v Y，v ∈ T_pM（BM §5.6）。(ii) 只对常数线性：(iii) 说明乘以函数会多出 (X f)Y。
  - 例：ℝⁿ 上 ∇_X Y = DY[X]（逐分量求方向导数）满足三条。
  - 许多联络：若 ∇ 是联络，B(X,Y) 对两个参数都 C^∞ 线性，则 ∇ + B 也是联络（补充，BM §5.3 末"there exist infinitely many"）。例：ℝ³ 上 DY[X] + X×Y，ℝ² 上 DY[X] + ⟨X,Y⟩a。需要额外条件挑出一个（c05）。
- proof_steps：
  1. 对 DY[X] 验证 (iii)：D(fY)[X] = (Df[X])Y + f DY[X] = (X f)Y + f DY[X]。
  2. ∇ + B：(i)(ii) 由 B 的线性保持；(iii) 中 B(X, fY) = fB(X,Y) 不产生额外项，所以 Leibniz 仍成立。
- necessity：
  - 去掉 (iii)：∇_X Y = 0 满足 (i)(ii) 但不是导数（常数倍以外的场也"导数为零"）；Leibniz 是"求导"的标志。
  - 把 (i) 换成只对常数线性：(∇_X Y)(p) 可能依赖 X 在 p 附近的值，不能定义 ∇_v Y。补充例：ℝⁿ 上 ∇_X Y = DY[X] + (div X)Y 满足 (ii)(iii)，但 ∇_{fX}Y − f∇_X Y = (X f)Y ≠ 0；它在 p 的值还依赖 X 在 p 处的导数。
- visual_events：
  - e1｜"Three properties of the Euclidean derivative"｜三行，左栏欧氏，右栏公理｜逐行配对｜—｜ledger：(i) (ii) (iii)
  - e2｜"Pointwise in the direction"｜两条方向场在 p 处相同、别处不同，∇ 在 p 的值相同（箭头重合）｜—｜—｜—
  - e3｜"Leibniz"｜Y 乘以函数 f（颜色），∇_X(fY) 分解成两项箭头｜—｜—｜—
  - e4｜"Many connections"｜同一 X, Y，三个联络给出三个不同箭头（白、红、紫）｜—｜—｜∇ + B
- outcome_check：观众能检查 ∇_X Y = DY[X] + X×Y 满足 (iii)。
- source：讲义 p.25–26；BM §5.2、§5.3、Def 5.20、§5.6。
- next：在坐标里，一个联络由什么决定？

### c04-christoffel-symbols — 坐标描述与 Christoffel 符号

- question：观众能从三条公理推出 ∇_X Y = (X(Y^k) + Γ^k_ij XⁱY^j)E_k，在极坐标中算出 Γ，并解释"分量为常数"不等于"导数为零"。
- requires：affine-connection、chart-coordinates。
- music：proof
- teaching_sequence：
  - 推导（讲义 p.26，照片 39e3）：局部坐标 (x¹,…,xⁿ) 于开集 U，E_i = ∂/∂xⁱ。X = XⁱE_i，Y = Y^jE_j（Xⁱ, Y^j ∈ C^∞(U)）。∇_X Y = ∇_{XⁱE_i}(Y^jE_j) = Xⁱ∇_{E_i}(Y^jE_j)  [由 (i)] = XⁱY^j∇_{E_i}E_j + Xⁱ(∂_iY^j)E_j  [由 (ii)(iii)]。
  - 定义 Γ^k_ij：∇_{E_i}E_j = Γ^k_ij E_k（n³ 个函数）。于是 ∇_X Y = (X(Y^k) + Γ^k_ij XⁱY^j)E_k。联络在 U 上完全由 Γ 决定。
  - 例（补充）：ℝ² 欧氏联络 DY[X]，极坐标 E_r = (cos θ, sin θ)，E_θ = (−r sin θ, r cos θ)：∂_rE_r = 0；∂_rE_θ = (−sin θ, cos θ) = E_θ/r；∂_θE_r = E_θ/r；∂_θE_θ = −rE_r。所以 Γ^r_θθ = −r，Γ^θ_rθ = Γ^θ_θr = 1/r，其余为 0。
  - 寓意：场 Y = E_r 的分量是常数 (1, 0)，但 ∇_{E_θ}E_r = E_θ/r ≠ 0：坐标基本身在转动。Γ 记录的就是基的转动。
- proof_steps：上面的展开与四个偏导。
- necessity：
  - 若用"分量的导数"∇_X Y := X(Y^k)E_k（即 Γ = 0）定义：换到笛卡尔坐标它是 DY[X]，换到极坐标它给出另一个算子；同一个几何对象在不同坐标下得到不同答案，所以 Γ 不能省（补充）。数值：Y = E_r，X = E_θ，在 (r,θ) = (2, 0)：DY[X] = (0, 1)，而"Γ = 0"给出 0。
- visual_events：
  - e1｜"Expand in a frame"｜推导四行逐行出现｜—｜—｜ledger：∇_{E_i}E_j = Γ^k_ij E_k
  - e2｜"Polar coordinates"｜ℝ² 极坐标网格；E_r（橙）、E_θ（紫）箭头阵列，E_θ 长度随 r 增大｜—｜—｜—
  - e3｜"The frame turns"｜沿一条 θ 线移动，E_r 箭头转动；差向量指向 E_θ 方向｜—｜—｜Γ^θ_θr = 1/r
  - e4｜"Γ = 0 is coordinate-dependent"｜两个读数并排（DY[X] = (0,1) vs 0）｜—｜—｜—
- outcome_check：观众能写出极坐标中 ∇_{E_θ}E_θ = −rE_r 并说出其几何意义（E_θ 沿圆周转向圆心）。
- source：讲义 p.26、照片；极坐标例子为补充（标准结果）。
- next：度量出现后，要求哪两条性质？

### c05-compatibility-torsion — 与度量相容；无挠

- question：观众能写出两条性质，说出各自的几何含义，并用两个反例说明二者互不蕴含；知道坐标中无挠 ⇔ Γ^k_ij = Γ^k_ji。
- requires：affine-connection、riemannian-metric、lie-bracket-field。
- music：definition
- teaching_sequence：
  - 相容（讲义 p.27，照片 0f15）：X⟨Y,Z⟩ = ⟨∇_X Y, Z⟩ + ⟨Y, ∇_X Z⟩——内积的乘积法则。含义：沿曲线"导数为零"的向量（c10）长度与夹角不变。
  - 无挠（照片 eb13）：∇_X Y − ∇_Y X = [X,Y]——欧氏中 DY[X] − DX[Y] = [X,Y]（c02）。坐标中 [E_i, E_j] = 0，所以 ∇_{E_i}E_j − ∇_{E_j}E_i = (Γ^k_ij − Γ^k_ji)E_k = 0 ⇔ Γ 对下标对称（照片 0f15 "NB"）。
  - 欧氏联络两条都满足（BM Thm 5.7）。极坐标 Γ^θ_rθ = Γ^θ_θr = 1/r 对称（c04）。
  - 反例 1（补充）：ℝ³ 上 ∇¹_X Y = DY[X] + X×Y。相容：⟨X×Y,Z⟩ + ⟨Y,X×Z⟩ = det(X,Y,Z) + det(X,Z,Y) = 0。有挠：∇¹_X Y − ∇¹_Y X − [X,Y] = 2X×Y。几何：沿 e₁ 直线"导数为零"的向量绕 e₁ 旋转（像螺旋），长度不变。
  - 反例 2（补充）：ℝ² 上 ∇²_X Y = DY[X] + ⟨X,Y⟩a，a = e₁。无挠（多出的项对称）。不相容：X = Y = Z = e₁ 时左边 0，右边 2⟨e₁,e₁⟩⟨a,e₁⟩ = 2。几何：沿 e₁ 直线"导数为零"的向量满足 ż₁ = −z₁，第一分量指数衰减，长度变小。
  - "torsion"一词的来历：反例 1 中向量沿直线拧转。
- proof_steps：上述代数验证；平行条件 Ż + B(γ̇, Z) = 0 对两个 B 的解：ż = −e₁×z（绕 e₁ 转，角速度 1）；ż₁ = −z₁, ż₂ = 0。
- necessity：两个反例分别说明去掉任一条，另一条不足以保证"沿直线搬运向量不变"。
- visual_events：
  - e1｜"Compatible with the metric"｜公式；两向量沿曲线移动，夹角数字不变｜—｜—｜ledger：compatible
  - e2｜"Torsion-free"｜公式；Γ 表格对称位置连线｜—｜—｜ledger：torsion-free ⇔ Γ^k_ij = Γ^k_ji
  - e3｜"Compatible but twisted"｜3D：沿 e₁ 的直线，一串向量绕直线旋转（紫）｜—｜—｜2X×Y ≠ 0
  - e4｜"Torsion-free but shrinking"｜2D：沿 x 轴，一串向量的 x 分量衰减（紫）｜—｜—｜2 ≠ 0
- outcome_check：观众能判断 DY[X] + ⟨X,Y⟩a 违反哪一条。
- source：讲义 p.27、照片 0f15、eb13；BM Thm 5.6 性质 4–5、Thm 5.7。两个反例为补充。
- next：两条一起，能唯一确定联络吗？

### c06-fundamental-theorem — 黎曼几何基本定理与 Koszul 公式

- question：观众能由相容与无挠推出 Koszul 公式，说出它为什么给出唯一性，并用坐标形式算出极坐标的 Γ。
- requires：compatibility、torsion-free、riemannian-metric（Riesz）。
- music：proof
- teaching_sequence：
  - 定理（讲义 p.28，照片 1e01；BM Thm 5.6）：黎曼流形上存在唯一的与度量相容且无挠的联络——Levi-Civita（黎曼）联络。
  - Step 1（唯一性）：把相容写三遍并轮换 (X,Y,Z)：
    X⟨Y,Z⟩ = ⟨∇_X Y,Z⟩ + ⟨Y,∇_X Z⟩
    Y⟨Z,X⟩ = ⟨∇_Y Z,X⟩ + ⟨Z,∇_Y X⟩
    Z⟨X,Y⟩ = ⟨∇_Z X,Y⟩ + ⟨X,∇_Z Y⟩
    前两行相加减去第三行，按无挠把 ∇_X Z − ∇_Z X 换成 [X,Z]、∇_Y Z − ∇_Z Y 换成 [Y,Z]、∇_Y X 换成 ∇_X Y − [X,Y]：
    2⟨∇_X Y, Z⟩ = X⟨Y,Z⟩ + Y⟨Z,X⟩ − Z⟨X,Y⟩ − ⟨X,[Y,Z]⟩ + ⟨Y,[Z,X]⟩ + ⟨Z,[X,Y]⟩。
    右边不含 ∇；对每个 Z 已知 ⟨∇_X Y, Z⟩，由 Riesz（E06）∇_X Y 被确定。
  - Step 2（存在，概要）：用 Koszul 右边定义 ∇_X Y；验证右边对 Z 是 C^∞ 线性的、所定义的算子满足三条公理与两条性质（BM 称"直接但繁琐"）。子流形的情形 c07 直接给出。
  - 坐标形式（补充，标准结果）：取 X = E_i，Y = E_j，Z = E_l，括号全为 0，g_ij = ⟨E_i,E_j⟩：Γ^k_ij = ½ g^{kl}(∂_i g_jl + ∂_j g_il − ∂_l g_ij)。极坐标 g = diag(1, r²)：Γ^r_θθ = ½·1·(−∂_r r²) = −r；Γ^θ_rθ = ½·r⁻²·∂_r r² = 1/r——与 c04 的直接计算一致。
- proof_steps：上面的三行与代换；坐标代入。
- necessity：
  - 只要相容（反例 1）或只要无挠（反例 2），都有不同于欧氏的联络；两条合起来才唯一。
- visual_events：
  - e1｜"The theorem"｜方框陈述｜—｜—｜ledger：∃! compatible + torsion-free
  - e2｜"Write compatibility three times"｜三行，轮换处颜色标记｜第三行取负号，相加｜—｜—
  - e3｜"Use torsion-freeness"｜三处替换依次高亮，得到 Koszul 公式（方框）｜—｜—｜ledger：Koszul
  - e4｜"In coordinates"｜Γ 公式；极坐标代入两行，结果与 c04 的数值并排打勾｜—｜—｜—
- outcome_check：观众能说出 Koszul 公式右边为什么不依赖 ∇，以及这为什么给出唯一性。
- source：讲义 p.28、照片 1e01；BM Thm 5.6 及其证明概要。坐标公式与极坐标核对为补充。
- next：子流形上，这个唯一的联络长什么样？

### c07-submanifold-connection — 子流形上的 Levi-Civita 联络：投影欧氏导数

- question：观众能写出 ∇_v X = Proj_p(DX̄(p)[v])，证明它不依赖延拓、满足三条公理、相容且无挠，并在球面上计算一个例子。
- requires：projector（E07）、fundamental-theorem。
- music：proof
- teaching_sequence：
  - 构造（讲义 p.28–29）：M ⊆ ℝⁿ 带嵌入度量，X ∈ 𝔛(M)。Step 1：取 X 在 M 附近开集 U 上的光滑延拓 X̄。Step 2：X̄ 定义在 ℝⁿ 的开集上，它的普通微分 DX̄(p)[v] 对所有 v ∈ ℝⁿ 有定义。定义 ∇_v X = Proj_p(DX̄(p)[v])，v ∈ T_pM。
  - 不依赖延拓：v 切于 M 时取 M 上速度为 v 的曲线 c，DX̄(p)[v] = (X̄∘c)'(0) = (X∘c)'(0) 只用 X 在 M 上的值（E06 同样的论证）。
  - 是联络（BM Thm 5.2）：DX̄ 满足 (i)–(iii)，Proj 线性，所以投影后仍满足（Leibniz：Proj(f DȲ[v] + Df[v]Ȳ) = f∇_vY + Df[v]Y，因 Y 已切）。
  - 相容（BM Thm 5.9）：X⟨Y,Z⟩ = ⟨DȲ[X],Z⟩ + ⟨Y,DZ̄[X]⟩；Z 切，所以 ⟨DȲ[X],Z⟩ = ⟨Proj DȲ[X],Z⟩；另一项同理。
  - 无挠（BM Thm 5.8）：∇_X Y − ∇_Y X = Proj(DȲ[X] − DX̄[Y]) = Proj([X̄,Ȳ])。只需 [X̄,Ȳ] 在 M 上切于 M 并等于 [X,Y]：设 M = {h = 0}，在 M 上 Dh(x)[Y(x)] = 0；沿切向 X 求导得 D²h(x)[X,Y] + Dh(x)[DȲ(x)[X]] = 0；对调后相减，D²h 对称（E03），得 Dh(x)[DȲ[X] − DX̄[Y]] = 0，即切于 M（补充：BM 用不同写法，结论同）。
  - 于是由唯一性（c06）它就是 Levi-Civita 联络。注意：换一个度量（非嵌入度量）时 Levi-Civita 联络可能不同（BM §5.3 末）。
  - 球面例子（补充）：旋转场 V(x) = e₃ × x，V̄ 用同一公式，DV̄(x)[u] = e₃ × u，∇_u V = Proj_x(e₃ × u)。在赤道点 x 取 u = V(x)：e₃ × (e₃ × x) = −x，纯法向，∇_V V = 0。在极角 θ 的纬线上：e₃ × (e₃ × x) = −(x₁, x₂, 0)，切向分量大小 sin θ cos θ，指向极点。
  - 回到 c01：圆上 γ̈ = −γ 纯法向，投影后为 0。
- proof_steps：如上。
- necessity：
  - 不投影：DV̄[u] 在赤道上等于 −x，不切（c01 的问题）。
  - 用别的投影（非正交）：仍是联络（c03 的"许多联络"），但不相容（补充，只口头）。
- visual_events：
  - e1｜"Extend, differentiate, project"｜S²，切平面；V 的箭头；DV̄[u]（红）伸出平面，投影（黄）落回平面｜—｜—｜ledger：∇_v X = Proj(DX̄[v])
  - e2｜"Independent of the extension"｜两个延拓（白、紫）在球外不同，沿 M 的曲线导数相同｜—｜—｜—
  - e3｜"Compatible, torsion-free"｜两段证明各四行；D²h 对称处高亮｜—｜—｜ledger：Levi-Civita
  - e4｜"Rotation field"｜e₃ × x 的箭头阵列；赤道上 ∇_V V = 0，纬线上黄色小箭头指向极点，长度 sin θ cos θ｜随纬度滑动显示读数｜—｜—
- outcome_check：观众能计算 S² 上 ∇_u V 当 V(x) = Proj_x(a)（常向量 a 的切向部分）时的公式。（补充答案：DV̄(x)[u] = −(xᵀa)u − (uᵀa)x，投影得 −(xᵀa)u。）
- source：讲义 p.28–29；BM Thm 5.2、5.8、5.9。旋转场例子与 outcome 答案为补充。
- next：用它对曲线的速度求导。

### c08-geodesics — 曲线上的协变导数与测地线

- question：观众能写出曲线上的协变导数与加速度，判断大圆与纬线圈哪个是测地线，写出坐标中的测地线方程，并说出为什么给定起点与初速度的测地线唯一。
- requires：submanifold-connection、christoffel、ode-existence。
- music：definition
- teaching_sequence：
  - 曲线上的场：Z(t) ∈ T_{γ(t)}M。协变导数 D/dt：满足 ℝ 线性、Leibniz、链式性质的唯一算子（BM Thm 5.29）；子流形上 D/dt Z = Proj_{γ(t)}(Ż(t))（BM Prop 5.31）。
  - 加速度（BM Def 5.36）：γ'' = D/dt γ̇。测地线（讲义 p.29，BM Def 5.38）：γ'' = 0，即 ∇_γ̇ γ̇ = 0（讲义方框）。子流形上 ⇔ γ̈ 处处垂直于 T_{γ(t)}M。
  - 大圆 γ(t) = cos t·x + sin t·v（x ⊥ v 单位）：γ̈ = −γ，纯法向 ⇒ 测地线。速率恒为 1。
  - 纬线圈（极角 θ，单位角速度）：切向加速度大小 sin θ cos θ（θ = 90°：0；60°：0.433；45°：0.5；30°：0.433），只有赤道是测地线。
  - 坐标形式（讲义 c04 + 补充）：γ'' = (ẍ^k + Γ^k_ij ẋⁱẋ^j)E_k，测地线方程 ẍ^k + Γ^k_ij ẋⁱẋ^j = 0。这是光滑的二阶 ODE：给定 γ(0) = x、γ̇(0) = v 局部存在唯一（E03，讲义 p.30"determined by γ_v(0) = x, γ̇_v(0) = v"）。
  - 极坐标检验（补充）：r̈ − rθ̇² = 0，θ̈ + (2/r)ṙθ̇ = 0。直线 (1, t)：r = √(1+t²)，θ = arctan t，两式残差 ≤ 2.3e−16。
  - 测地线速率恒定：d/dt⟨γ̇,γ̇⟩ = 2⟨γ'',γ̇⟩ = 0（相容）。
- proof_steps：大圆、纬线计算（γ̈ + sin²θ·γ 的范数 = sin θ cos θ）；坐标展开 γ'' = D/dt(ẋ^jE_j) = ẍ^jE_j + ẋ^jẋⁱ∇_{E_i}E_j。
- necessity：
  - 欧氏加速度 γ̈ 不能当判据：大圆的 γ̈ ≠ 0。
  - 只要求"速率恒定"不够：纬线圈速率恒定但不是测地线。
- visual_events：
  - e1｜"Acceleration on a manifold"｜S²，曲线上一点的 γ̈（红）分解为法向（红虚）与 γ''（黄）｜—｜—｜ledger：γ'' = Proj(γ̈)
  - e2｜"Great circle"｜大圆上走动的点，γ̈ 纯法向，γ'' 为零（无黄箭头）｜—｜—｜ledger：geodesic ⇔ γ'' = 0
  - e3｜"Latitude circles"｜纬线圈滑动，黄色 γ'' 箭头指向北极；右侧 MiniPlot 画 sin θ cos θ｜随 θ 移动｜—｜—
  - e4｜"The geodesic equation"｜坐标方程；极坐标中直线与两条残差读数｜—｜—｜ẍ^k + Γ^k_ij ẋⁱẋ^j = 0
  - e5｜"One geodesic per initial velocity"｜从同一点按不同方向射出的大圆扇｜—｜—｜—
- outcome_check：观众能说明为什么 S² 上大圆以恒定速率前进是测地线、以变速率前进则不是（补充：γ̈ 出现切向分量 φ̈ γ̇）。
- source：讲义 p.29–30；BM Thm 5.29、Prop 5.31、Def 5.36、5.38。纬线、极坐标检验为补充。
- next：把"从 x 沿 v 的测地线"做成一个映射。

### c09-exponential-map — 指数映射

- question：观众能定义 Exp_x，写出球面公式，说出它的定义域与单射半径，证明它是 retraction，并用误差斜率说明它与归一化 retraction 二阶一致而与只满足一阶条件的 retraction 不同。
- requires：geodesic、retraction（E06）。
- music：definition
- teaching_sequence：
  - 定义（讲义 p.29–30；BM Def 10.16）：γ_v 是 γ_v(0) = x、γ̇_v(0) = v 的测地线；Exp_x(v) = γ_v(1)，定义在 T_xM 中使 γ_v 存在到 t = 1 的开集 U 上。缩放：γ_{tv}(s) = γ_v(ts)，所以 Exp_x(tv) = γ_v(t)（讲义 p.30）。
  - 球面：Exp_x(v) = cos‖v‖·x + sin‖v‖·v/‖v‖（v ≠ 0），Exp_x(0) = x；定义在整个 T_xS² 上。‖v‖ < π 时单射；‖v‖ = π 的圆整个映到 −x：单射半径 π（BM Def 10.19）。
  - 是 retraction：Exp_x(0) = x；d/dt Exp_x(tv)|₀ = γ̇_v(0) = v，即 DExp_x(0) = id。
  - 二阶 retraction（BM Def 5.42、Prop 10.18）：c(t) = R_x(tv) 满足 c''(0) = 0。Exp：c 是测地线，处处 c'' = 0。
  - 归一化 retraction（E06）：c(t) = (x + tv)/√(1 + t²)，c̈(0) = −x 纯法向 ⇒ c''(0) = 0，也是二阶的（BM Prop 5.55 的特例）。数值：‖R_x(tv) − Exp_x(tv)‖/t³ → 1/3（0.305, 0.326, 0.331, 0.333 于 t = 0.4, 0.2, 0.1, 0.05）。
  - 只满足一阶条件的 retraction（补充）：R'_x(v) = (x + v + ½‖v‖²w)/‖…‖，w 为与 v 正交的单位切向量（固定）：R'_x(0) = x、DR'_x(0) = id 成立，但 c̈(0) 有切向分量 w，c''(0) = w ≠ 0；误差/t² → 1/2（0.479, 0.495, 0.499, 0.4997）。log–log 图上斜率 3 对 2。
  - 用途：一阶分析（E07）任意 retraction 都行；二阶分析（Newton 局部二次收敛、Hessian 用拉回计算，BM Prop 5.44–5.45）要求二阶 retraction 或在临界点。
- proof_steps：球面公式验证：c(t) = cos t·x + sin t·u（u = v/‖v‖，t 按弧长）是大圆；归一化 c̈(0) 的计算；R' 的计算。
- necessity：只满足 retraction 两条件的映射不一定二阶一致（R' 反例）。
- visual_events：
  - e1｜"Shoot a geodesic"｜切平面上的向量 v，从 x 出发的大圆弧长度 ‖v‖ 到达 Exp_x(v)｜—｜—｜ledger：Exp_x(tv) = γ_v(t)
  - e2｜"Wrapping the tangent plane"｜切平面上半径递增的圆被映到球上的纬线圈；半径 π 的圆收缩到 −x｜半径 0 → π｜—｜inj = π
  - e3｜"Exp is a retraction"｜两条性质两行｜—｜—｜—
  - e4｜"Three curves"｜Exp（白）、归一化（绿）、R'（红）三条曲线从 x 出发；右侧 log–log 误差图，参考斜率 3、2｜—｜—｜ledger：second order: c''(0) = 0
- outcome_check：观众能写出 S² 上 Exp_x(v) 并说出 ‖v‖ = π 时发生什么。
- source：讲义 p.29–30；BM Def 10.16、10.19、Prop 10.18、Def 5.42、Prop 5.55。误差数值与 R' 反例为补充。
- next：沿曲线搬运切向量。

### c10-parallel-transport — 平行移动

- question：观众能定义平行移动，证明它是线性等距，在球面大圆上描述它，并通过八分之一球面三角形说明它依赖路径。
- requires：covariant-along-curve、compatibility。
- music：definition
- teaching_sequence：
  - 定义（讲义 p.30；BM Def 10.33、10.35）：沿 γ: [0,1] → M 的场 Z 若 D/dt Z = 0 称为平行的；给定 Z(0) = v 存在唯一平行场（线性 ODE，BM Thm 10.34）；Π_γ: T_{γ(0)}M → T_{γ(1)}M，v ↦ Z(1)。
  - 线性：方程线性。等距（BM Prop 10.36）：Z, W 平行时 d/dt⟨Z,W⟩ = ⟨D/dt Z, W⟩ + ⟨Z, D/dt W⟩ = 0（相容）。反例 2（c05）中长度会变——相容不可少。
  - 球面子流形形式：D/dt Z = Proj(Ż) = 0 ⇔ Ż ∥ γ；由 ⟨Z,γ⟩ = 0 得 Ż = −⟨Z, γ̇⟩γ。
  - 沿大圆：γ̇ 本身平行（测地线），所以平行向量与 γ̇ 的夹角不变。
  - 路径依赖（补充）：N → e₁（经线）→ e₂（赤道）→ N（经线），初始向量指向 e₁ 方向；在 e₁ 处为 −e₃，在 e₂ 处为 −e₃，回到 N 时为 e₂：转了 90°，长度 1（数值积分，RK4，误差 < 1e−12）。90° 恰好是三角形面积 π/2（球面 Gauss–Bonnet，只提一句）。
  - 用途：比较不同点的切向量——共轭梯度、BFGS 要把上一步的梯度搬到新点（BM §10.5 transporters，E07 c10 预告）。
- proof_steps：等距的一行；球面 ODE 的推导；三段平行移动的结果（经线上向量保持与速度平行或垂直的关系）。
- necessity：
  - 欧氏"平移"Z(t) = 常向量：离开切平面，不行。
  - 不相容的联络（c05 反例 2）：长度改变，不是等距。
- visual_events：
  - e1｜"Keep the derivative zero"｜S² 上一条曲线，一串向量（橙）沿曲线排列；D/dt Z = 0 方框｜—｜—｜ledger：D/dt Z = 0
  - e2｜"An isometry"｜两向量夹角与长度读数沿途不变｜—｜—｜ledger：Π_γ isometry
  - e3｜"Along a great circle"｜向量与速度夹角恒定｜—｜—｜—
  - e4｜"Around a triangle"｜八分之一球面三角形三段依次搬运；回到 N 后与初始向量夹角 90° 标注｜—｜—｜90° = area π/2
  - e5｜"Why optimizers care"｜两点的梯度箭头，搬运后才能相减（CG 预告）｜—｜—｜—
- outcome_check：观众能解释为什么平行移动保持长度，以及为什么不能把向量"直接平移"到另一点。
- source：讲义 p.30；BM Def 10.33、Thm 10.34、Def 10.35、Prop 10.36、§10.5。三角形数值为补充。
- next：回顾，并用联络定义 Hessian。

### c11-recap — 回顾与下一步：黎曼 Hessian

- question：观众能复述本集的结论链，并写出 Hess f(x)[u] = ∇_u grad f。
- requires：全部。
- music：recap
- teaching_sequence：
  - 结论链：速度场求导失败 → 李括号 → 联络公理 → Γ → 相容 + 无挠 → Koszul ⇒ 唯一 → 子流形：投影欧氏导数 → γ'' = 0 → Exp → Π_γ。
  - 预告（BM Def 5.14）：Hess f(x)[u] = ∇_u grad f。球面瑞利商：Hess f(x)[u] = Proj_x(Au) − (xᵀAx)u；在 e₃ 处特征值 1、3（与 E07 c07 一致）。下一集：Hessian 的性质与 Newton 方法。
- visual_events：
  - e1｜"The chain"｜结论链逐行点亮，每行标章号｜—｜—｜—
  - e2｜"Next: the Riemannian Hessian"｜S²，e₃ 处切平面上 Hessian 的两个特征方向（长度 1、3）｜—｜—｜Hess f(x)[u] = ∇_u grad f
- outcome_check：观众能说出 c01 中两个失败的"导数"各被哪个工具修好。
- source：BM Def 5.14、(5.1)。
- next：E09 黎曼 Hessian 与 Newton 方法（视课程顺序）。

## Glossary additions

| id | en | zh | symbol | spoken |
|---|---|---|---|---|
| vector-field | vector field | 向量场 | X ∈ 𝔛(M) | vector field |
| lie-bracket | Lie bracket | 李括号 | [X, Y] | Lie bracket |
| affine-connection | affine connection | 仿射联络 | ∇ | affine connection |
| covariant-derivative | covariant derivative | 协变导数 | ∇_X Y | covariant derivative |
| christoffel-symbols | Christoffel symbols | Christoffel 符号 | Γ^k_ij | Christoffel symbols |
| metric-compatibility | metric compatibility | 与度量相容 | X⟨Y,Z⟩ = ⟨∇_X Y,Z⟩ + ⟨Y,∇_X Z⟩ | metric compatibility |
| torsion-free | torsion-free | 无挠 | ∇_X Y − ∇_Y X = [X,Y] | torsion free |
| levi-civita-connection | Levi-Civita connection | Levi-Civita 联络 | ∇ | Levi-Civita connection |
| koszul-formula | Koszul formula | Koszul 公式 | 2⟨∇_X Y, Z⟩ = … | Koszul formula |
| acceleration | acceleration | 加速度 | γ'' = D/dt γ̇ | acceleration |
| geodesic | geodesic | 测地线 | ∇_γ̇ γ̇ = 0 | geodesic |
| injectivity-radius | injectivity radius | 单射半径 | inj(x) | injectivity radius |
| second-order-retraction | second-order retraction | 二阶 retraction | c''(0) = 0 | second order retraction |
| parallel-transport | parallel transport | 平行移动 | Π_γ | parallel transport |

## 估计时长

| 章 | 估计分钟 |
|---|---|
| c01 | 3.5 |
| c02 | 4.5 |
| c03 | 4.0 |
| c04 | 4.0 |
| c05 | 5.0 |
| c06 | 4.5 |
| c07 | 5.0 |
| c08 | 5.0 |
| c09 | 4.5 |
| c10 | 4.5 |
| c11 | 2.0 |
| 合计 | 约 46 |
