# E05 — Tangent Spaces and the Orthogonal Group

## 全集框架

- 核心问题：站在约束集 M 上的一点 p，哪些方向能让我们"一阶地"留在 M 上？对于由方程 h(x)=c 给出的 M，能不能不画任何 chart，只靠求导就算出这组方向？在 O(n) 这样的高维矩阵流形上，这套机器能告诉我们什么？
- 受众起点：已学过 E03（导数是最佳线性近似、方向导数技巧 DF(x)[v] = d/dt F(x+tv)|₀、链式法则）和 E04（隐函数定理、正则值、正则水平集定理及其图像参数化 ψ(x)=(x,g(x))、球面是正则水平集、(xᵀx−1)² 的反例）。课上听过 T_pM = ker Dh(p) 和 T_R O(n) = R·Skew(n)，但不清楚"为什么是核""为什么陪域取 Sym(n)""维数为什么能对上"。
- 主线：优化器需要方向 → M 上的点不能相减，所以用"留在 M 内的曲线的速度"定义切向量 → 工具：秩–零化度 → 定理 T_pM = ker Dh(p)：⊆ 由链式法则得到，⊇ 由图像参数化加维数夹逼得到 → 正则性的必要性：(xᵀx−1)² 和交叉点 → 球面 x^⊥ → O(n)：微分、陪域为何必须是 Sym(n)、满射、维数、R·Skew(n) → SO(n) 与 SO(3)：三个旋转自由度 → 过渡到 E06：已知可行方向，下一步是选哪个方向、怎样移动。
- 内容依赖：

| content_id | 内容 | 前置 | 建立位置 |
|---|---|---|---|
| derivative-linear-approx | 导数是最佳线性近似 | — | e03（受众已知） |
| directional-derivative | DF(x)[v] = d/dt F(x+tv)\|₀ | derivative-linear-approx | e03（受众已知） |
| chain-rule | D(h∘γ)(t) = Dh(γ(t))·γ'(t) | derivative-linear-approx | e03（受众已知） |
| implicit-function-theorem | 局部图像 y = g(x) | inverse-function-theorem | e04 |
| regular-value | Dh(x) 在 h⁻¹(c) 上处处满射 | jacobian | e04 |
| regular-level-set | h⁻¹(c) 是 n−k 维嵌入子流形，局部 M∩(A×B) = {(x,g(x))} | implicit-function-theorem, regular-value | e04 |
| graph-parametrization | ψ(x)=(x,g(x))，φ(x,y)=x | regular-level-set | e04 |
| sphere-level-set | Sⁿ⁻¹ = h⁻¹(1)，h(x)=xᵀx，Dh(x)[v]=2xᵀv | regular-level-set | e04 |
| non-regular-sphere | (xᵀx−1)² 的零集是球面，但 0 不是正则值 | regular-value | e04 |
| cross-level-set | x²−y²=0 在原点是交叉 | regular-value | e04 |
| subspace-dimension | 子空间、基、维数；同维子空间包含即相等 | — | 受众已知（线性代数），e05-c03 复习 |
| rank-nullity | dim ker A + rank A = n | subspace-dimension | e05-c03 |
| tangent-vector-curve | 切向量 = 曲线速度 γ'(0) | smooth-manifold, chain-rule | e05-c02 |
| tangent-kernel-subset | T_pM ⊆ ker Dh(p) | tangent-vector-curve, chain-rule | e05-c04 |
| tangent-kernel-equal | T_pM = ker Dh(p) | tangent-kernel-subset, graph-parametrization, rank-nullity | e05-c05 |
| regularity-necessity | 正则性使核的大小正确 | tangent-kernel-equal, non-regular-sphere | e05-c06 |
| sphere-tangent | T_xSⁿ⁻¹ = x^⊥ | tangent-kernel-equal, sphere-level-set | e05-c06 |
| frobenius | ⟨A,B⟩ = tr(AᵀB)，ℝ^{n×n} ≅ ℝ^{n²} | — | e05-c07 |
| sym-skew-split | ℝ^{n×n} = Sym(n) ⊕ Skew(n)，维数 n(n+1)/2 与 n(n−1)/2 | subspace-dimension | e05-c07 |
| on-differential | DF(R)[H] = RᵀH + HᵀR | directional-derivative | e05-c07 |
| codomain-necessity | 陪域必须是 Sym(n) | on-differential, regular-value | e05-c07 |
| on-manifold | O(n) 是 n(n−1)/2 维嵌入子流形 | codomain-necessity, regular-level-set | e05-c08 |
| on-tangent | T_R O(n) = R·Skew(n) | on-manifold, tangent-kernel-equal | e05-c09 |
| so-n | SO(n)：O(n) 中 det=1 的分支，切空间同上 | on-tangent | e05-c10 |

- 本集使用的术语：tangent-space, kernel, rank-nullity, regular-value, level-set, embedded-submanifold, implicit-function-theorem, jacobian, smooth-manifold, orthogonal-group, special-orthogonal-group, symmetric-matrix, skew-symmetric-matrix, chart；新增见文末。

### 全集画面约定

- **证明账本（proof ledger）**：屏幕右上角一个固定面板，最多保留 3–4 条已经建立的事实，用 KaTeX 渲染。新事实从底部进入，最旧的一条淡出。一个证明结束时，整本账本收拢成一行带 "∎" 的结论。
- **配色**：M 和曲线用青色；切向量和切平面用橙色；Dh 的核用紫色半透明；∇h 和法向量用红色。矩阵网格中，Sym 部分（对角线及上三角的镜像对）用蓝色，Skew 部分用黄色。
- 3D 讲解公式时，相机停在固定视角；只在解释空间关系时缓慢环绕。

## 章节

### c01-why-directions — 优化器需要知道"能往哪走"

- question：观众能说出：为什么在约束集上迈步之前，必须先知道哪些方向在一阶意义下留在 M 上；以及为什么不能用"两点相减"来定义 M 上的方向。
- requires：regular-level-set、sphere-level-set（e04）；E01 中"欧氏梯度步离开球面"的动机画面。
- music：motivation
- teaching_sequence：
  - 直觉：在 ℝⁿ 中，任何方向 v 都能走，x + tv 仍在空间里。在球面上，x + tv 一般会离开球面。我们需要筛选出"贴着" M 的方向。
  - 定义：本章只提出问题；定义留给 c02。
  - 例子：S² 上的点 p，随机方向箭头离开球面，切平面内的箭头"擦过"球面。
  - 边界：M 中的两个点 q − p 是 ℝⁿ 中的向量，但当 q 在 M 上趋近 p 时，这个差的方向依赖于选择哪条路径趋近；而在抽象流形上，点之间根本没有减法。所以需要一个只依赖 M 内部运动的定义。
  - 用途：可行方向集合将是 E06 中梯度与 retraction 的舞台。
- proof_steps：无
- necessity：展示 x + tv 离开球面的距离为 | ‖p+tv‖ − 1 |。对一般的 v 它是 t 的一阶量；只有 v ⊥ p 时才是二阶量 t²‖v‖²/2 + O(t⁴)。由此引出"一阶留在 M 上"的含义（补充推导：‖p+tv‖² = 1 + 2t pᵀv + t²‖v‖²）。
- visual_events：
  - e1｜回顾 E04：球面是 h(x)=xᵀx 的正则水平集｜S²（青色半透明网格）、点 p、公式卡 "S² = h⁻¹(1)"｜球面淡入，p 点亮｜无｜p 停在北半球偏右
  - e2｜在 ℝ³ 中任何方向都能走｜从 p 出发的 6 根随机颜色箭头｜箭头长出；每根箭头的端点沿 p+tv 移动，端点离开球面时画出一条红色虚线，表示到球面的距离｜S²、p｜红色虚线保留
  - e3｜到球面的距离：一阶还是二阶｜右侧 2D 小图：横轴 t，纵轴 dist(p+tv, S²)；两条曲线：v 一般（呈 V 形，在 0 处为一阶）和 v ⊥ p（在 0 处平坦，为二阶）｜曲线随 t 画出；公式 "‖p+tv‖² = 1 + 2t pᵀv + t²‖v‖²" 中的 2t pᵀv 高亮｜3D 中的箭头变暗｜小图保留
  - e4｜贴着球面的方向组成一个平面｜橙色切平面在 p 处淡入；只把满足 pᵀv=0 的箭头着成橙色｜切平面出现｜小图移至左上角缩小｜切平面停留
  - e5｜不能用两点相减来定义方向｜M 上点 q 沿两条不同曲线趋近 p，并画出 (q−p)/‖q−p‖ 的箭头｜两条路径的箭头分别收敛到切平面内两个不同方向｜切平面｜屏幕文字 "Direction must come from motion inside M"
  - e6｜问题陈述｜标题卡 "Which directions keep us on M — to first order?"｜淡入｜无｜章末停留 2 秒
- outcome_check：观众能解释为什么球面上的 x+tv 一般会离开，以及为什么需要"在 M 内部运动"来定义方向。
- source：L3 §5 开头；HW p.10（Tangents 画图）；BD 434e07ef（"T_x(M) means the tangent space of M at x∈M"）；e3 的距离展开为补充（非笔记内容）
- next：c02 给出用曲线速度定义的切向量。

### c02-tangent-by-curves — 切向量：留在 M 内的曲线的速度

- question：观众能陈述 T_pM 的定义，并能解释：(1) 为什么用曲线；(2) 这个定义在定义层面只给出一个集合，还没有说它是向量空间。
- requires：tangent-vector-curve 的前置：smooth-manifold（e02）、chain-rule（e03）、embedded-submanifold（e04）。
- music：definition
- teaching_sequence：
  - 直觉：想象一只蚂蚁在球面上爬，它在时刻 0 位于 p 的瞬时速度一定贴着球面。反过来，每个贴着球面的方向，都可以作为某只蚂蚁的速度。
  - 定义（L3 Def 7）：M ⊆ ℝⁿ 是光滑嵌入子流形，p ∈ M。称 v ∈ ℝⁿ 为 M 在 p 处的切向量，如果存在光滑曲线 γ: (−ε,ε) → M，使 γ(0)=p 且 γ'(0)=v。所有切向量构成的集合记为 T_pM。
  - 例子：S² 上，赤道方向的大圆 γ(t) = (cos t, sin t, 0) 在 p=(1,0,0) 处的速度为 (0,1,0)；经线 γ(t) = (cos t, 0, sin t) 的速度为 (0,0,1)。加速曲线 γ(2t) 给出 2v；反向 γ(−t) 给出 −v；零曲线 γ(t) ≡ p 给出 0。
  - 边界：此时只知道 T_pM 是一个集合，并且对数乘封闭（重新参数化 γ(st) 给出 s·v）。"两个切向量的和仍是切向量"并不显然，因为两条曲线不能直接相加：γ₁(t)+γ₂(t)−p 一般不在 M 上。这一点要等到 c05 的定理才得到。
  - 用途：这是课程对切空间的官方定义；E06 中微分 df_x[γ'(0)] = (f∘γ)'(0) 也用曲线来定义。
- proof_steps：
  1. 数乘封闭：若 v = γ'(0)，s ∈ ℝ，令 σ(t) = γ(st)；对小 t，σ(t) ∈ M，σ(0) = p。由链式法则 σ'(0) = s·γ'(0) = s·v。s=0 时 σ ≡ p，给出零向量。
  2. 加法未定：γ₁(t)+γ₂(t)−p 的速度是 v₁+v₂，但该曲线一般不在 M 上（画面演示：在 S² 上它离开球面）。所以加法封闭需要另外证明。
- necessity：用 γ₁+γ₂−p 离开球面的动画，说明为什么不能直接相加。这强调了 c05 中"T_pM 是向量空间"是定理的结论，不是定义的一部分。
- visual_events：
  - e1｜蚂蚁的速度｜S²、点 p=(1,0,0)、一条青色光滑曲线 γ 穿过 p，一个小球沿 γ 移动｜小球沿 γ 匀速运动；经过 p 时，从 p 伸出一根橙色速度箭头 γ'(0)｜S²｜箭头停在 p
  - e2｜定义卡｜公式层："v ∈ T_pM ⇔ ∃ γ:(−ε,ε)→M, γ(0)=p, γ'(0)=v"｜逐项高亮 γ、γ(0)=p、γ'(0)=v，每项高亮时 3D 中对应对象闪烁｜3D 场景移到左侧 60%｜定义卡进入证明账本
  - e3｜两个例子：赤道与经线｜两条大圆曲线和它们在 p 处的速度箭头 (0,1,0)、(0,0,1)｜依次画出曲线和箭头；公式 γ(t)=(cos t, sin t, 0) 与 γ'(0)=(0,1,0) 同步出现｜S²、p｜两根橙色箭头保留
  - e4｜许多曲线的速度铺满一个平面｜20 条随机光滑曲线（固定种子）穿过 p，每条带一根速度箭头｜曲线逐条出现，箭头端点留下橙色点；点集逐渐铺满切平面，最后浮现半透明橙色切平面｜S²、p｜切平面
  - e5｜数乘：重新参数化｜曲线 γ(st)，s 取 2、−1、0｜s=2 时小球速度翻倍，箭头伸长；s=−1 时反向；s=0 时小球停住，箭头缩为一点｜切平面｜账本加入 "s·v ∈ T_pM"
  - e6｜加法并不显然｜γ₁、γ₂ 两条曲线和 γ₁+γ₂−p（红色虚线）｜红色曲线离开球面，并标注 "not in M"｜S²、两条曲线｜屏幕文字 "Is T_pM closed under addition? — wait for the theorem"
- outcome_check：给定 S² 上的一条具体曲线，观众能算出它在 p 处的切向量；并能指出为什么"切向量之和"不能由定义直接得到。
- source：L3 §5 Def 7；HW p.10 下半（Calculus on Embedded submanifolds, Tangents）；BD 9f2199（曲线 γ:(−ε,ε)→M）；数乘封闭与加法讨论为补充（非笔记内容）
- next：要把 T_pM 算出来，需要一个线性代数工具来比较维数：秩–零化度定理。

### c03-rank-nullity — 工具箱：秩–零化度定理

- question：观众能陈述并证明 dim ker A + dim im A = n，并能由此得到：k×n 的满行秩矩阵的核是 n−k 维。
- requires：subspace-dimension（受众已知：基、维数、线性无关）。
- music：proof
- teaching_sequence：
  - 直觉：一个线性映射 A: ℝⁿ → ℝᵏ 把 n 个维度分成两部分：被压扁成 0 的（核），以及活下来、张成像的。两部分的维数加起来必须是 n。
  - 定义：ker A = {v : Av = 0}，im A = {Av : v ∈ ℝⁿ}，rank A = dim im A。
  - 例子：A = [1 1 0; 0 0 1]（2×3）的核是直线 span{(1,−1,0)}，像是 ℝ²，1 + 2 = 3。
  - 边界：定理只说维数，不说哪个子空间；"满行秩 k" 等价于 im A = ℝᵏ（满射）。
  - 用途：c05 中用来得到 dim ker Dh(p) = n−k；c08 中用来理解 O(n) 的维数计数。
- proof_steps：
  1. 设 r = dim ker A，取 ker A 的基 v₁,…,v_r。
  2. 把它扩充成 ℝⁿ 的基 v₁,…,v_r, v_{r+1},…,v_n（线性代数的基扩充定理）。
  3. 断言 Av_{r+1},…,Av_n 是 im A 的一组基。
  4. 张成：任意 w = Av，其中 v = Σᵢ cᵢvᵢ，则 w = Σᵢ cᵢAvᵢ = Σ_{i>r} cᵢAvᵢ，因为 i ≤ r 时 Avᵢ = 0。
  5. 线性无关：若 Σ_{i>r} cᵢAvᵢ = 0，则 A(Σ_{i>r} cᵢvᵢ) = 0，所以 Σ_{i>r} cᵢvᵢ ∈ ker A，可写成 Σ_{j≤r} d_jv_j。移项得 Σ_{i>r} cᵢvᵢ − Σ_{j≤r} d_jv_j = 0。由于 v₁,…,v_n 线性无关，所有 cᵢ = 0。
  6. 因此 dim im A = n − r，即 dim ker A + rank A = n。
  7. 推论：若 A 是 k×n 矩阵且 rank A = k（等价于 A 满射），则 dim ker A = n − k。
  8. 附带引理（c05 要用）：若 W ⊆ V 是有限维子空间且 dim W = dim V，则 W = V。理由：W 的基是 V 中 dim V 个线性无关向量，因此也是 V 的基。
- necessity：画面对比 rank 2 与 rank 1 的 2×3 矩阵：rank 下降 1，核就多一维（从直线变成平面）。这正是 c06 中"正则性失效 → 核变大"的线性代数根源。
- visual_events：
  - e1｜映射压扁一些方向｜3D：ℝ³ 的坐标网格立方体；右侧 2D：ℝ² 平面；A = [1 1 0; 0 0 1]｜网格点从左边沿箭头映到右边；核直线（紫色）上的点全部落到原点｜无｜紫色核直线保留
  - e2｜基扩充｜核的基 v₁（紫色箭头），扩充向量 v₂、v₃（白色箭头）｜v₂、v₃ 依次出现｜核直线｜三根基向量
  - e3｜张成：核方向消失｜Av₁ = 0（紫色箭头缩成一点），Av₂、Av₃ 在右侧张成 ℝ²｜动画映射｜基向量｜右侧两根像箭头
  - e4｜线性无关的论证｜公式层逐行显示步骤 5 的推导｜每行出现时，对应向量闪烁｜3D 缩到左侧｜账本加入 "dim ker A + rank A = n"
  - e5｜rank 下降，核变大｜换成 A' = [1 1 0; 2 2 0]（rank 1）｜像塌缩成一条线；核从直线膨胀成平面（紫色平面）｜无｜并排显示两种情形和维数 1+2=3、2+1=3
  - e6｜推论与同维引理｜公式卡："rank A = k ⇒ dim ker A = n−k"；"W ⊆ V, dim W = dim V ⇒ W = V"｜淡入｜无｜账本保留这两条
- outcome_check：观众能对任意给出的 k×n 满秩矩阵说出核的维数，并复述线性无关那一步的论证。
- source：补充（非笔记内容；L3 Thm 4 证明中直接引用 rank–nullity）
- next：工具齐备，开始证明 T_pM = ker Dh(p) 的第一个包含关系。

### c04-kernel-contains-tangent — 第一步：T_pM ⊆ ker Dh(p)

- question：观众能用两行推导证明：任何切向量都在 Dh(p) 的核里；并理解它的几何含义："沿 M 运动时，约束值 h 不变"。
- requires：tangent-vector-curve（c02）、chain-rule（e03）、regular-level-set（e04）。
- music：proof
- teaching_sequence：
  - 直觉：在 M 上移动，h 的值始终等于 c，所以 h 沿运动方向的变化率是 0。而"h 沿 v 的变化率"正是 Dh(p)[v]。
  - 定义：M = h⁻¹(c)，h: U ⊆ ℝⁿ → ℝᵏ 光滑，c 是正则值。
  - 例子：球面上 h(γ(t)) = ‖γ(t)‖² ≡ 1，求导得 2γ(0)ᵀγ'(0) = 0，即 pᵀv = 0。
  - 边界：这一步完全没有用到正则性，对任意水平集都成立。正则性将在第二步出场。
  - 用途：给出 T_pM 的上界。
- proof_steps：
  1. 取 v ∈ T_pM。由定义，存在光滑 γ: (−ε,ε) → M，γ(0) = p，γ'(0) = v。
  2. 因为 γ(t) ∈ M = h⁻¹(c)，对所有 t ∈ (−ε,ε) 有 h(γ(t)) = c。
  3. 函数 t ↦ h(γ(t)) 是常数，所以 d/dt h(γ(t)) = 0 对所有 t 成立。
  4. 由链式法则，d/dt h(γ(t)) = Dh(γ(t))·γ'(t)。
  5. 取 t = 0：Dh(p)·v = 0，即 v ∈ ker Dh(p)。
  6. 因此 T_pM ⊆ ker Dh(p)。∎
- necessity：无（这一步对任意水平集成立）。屏幕注明 "No regularity used yet"，为 c06 埋下伏笔。
- visual_events：
  - e1｜沿 M 运动，h 不变｜左：S² 上小球沿 γ 运动；右：2D 图，横轴 t，纵轴 h(γ(t))，一条水平线停在高度 c=1｜小球移动的同时，右图曲线同步画出，始终是平的｜S²、曲线 γ｜水平线
  - e2｜对比：离开 M 的运动｜沿 p+tv（v 不切）运动的小球（红色），右图对应一条抛物线 1 + 2t pᵀv + t²‖v‖²｜画出抛物线，并在 t=0 处画切线，斜率 2pᵀv ≠ 0｜水平线保留｜两条曲线并列
  - e3｜逐步推导｜公式层依次显示步骤 2→5；"d/dt h(γ(t)) = 0" 与右图水平线的斜率 0 连线｜每行淡入；"Dh(p)·v = 0" 用紫色框起｜3D 缩小｜账本加入 "T_pM ⊆ ker Dh(p)"
  - e4｜几何：核是 ∇h 的正交补｜S² 上 p 处的红色法向量 ∇h(p) = 2p 和紫色平面 ker Dh(p) = {v : 2pᵀv = 0}｜紫色平面淡入，与 c02 的橙色切平面位置重合（橙色在内、紫色略大的同位平面）｜切平面｜两平面重叠
  - e5｜一般 k 个约束｜文字卡："Dh(p) has rows ∇h₁(p)ᵀ,…,∇h_kᵀ; ker Dh(p) = vectors orthogonal to every ∇hᵢ(p)"；3D 示意：ℝ³ 中两张曲面的交线（圆柱 x²+y²=1 与平面 z = y/2），交点处两条法向量与它们公共正交的方向（一条线）｜淡入｜无｜章末停留
  - e6｜第一步没有用到正则性｜屏幕角标 "regularity used: no"｜淡入｜账本｜保留到 c05
- outcome_check：观众能不看提示写出 h(γ(t)) ≡ c ⇒ Dh(p)γ'(0) = 0，并说出这里没有用到 c 是正则值。
- source：L3 §5 Thm 4 Step 1；HW p.12（h∘γ(t) ≡ c ⇒ Dh_x(ẋ)=0 ⇒ T_x(M) ⊆ ker Dh_x）；BD 9f2199 右侧（(h∘γ)'(t) = Dh_{γ(t)}[γ'(t)] ⇒ T_x(M) = ker Dh_x）；e5 的多约束几何为补充（非笔记内容）
- next：上界有了；第二步要证明 ker Dh(p) 中的每个向量都真的是某条 M 内曲线的速度。

### c05-tangent-equals-kernel — 第二步：维数夹逼得到 T_pM = ker Dh(p)

- question：观众能完整复述第二步：用隐函数定理给出的图像参数化造出一个 (n−k) 维的切向量子空间，再用 rank–nullity 和第一步把三个集合夹成相等；并能说出 "T_pM 是向量空间" 是这个定理的推论。
- requires：graph-parametrization（e04）、rank-nullity 与同维引理（c03）、tangent-kernel-subset（c04）。
- music：proof
- teaching_sequence：
  - 直觉：核可能"太大"吗？第一步只说切向量都在核里。我们要从另一边造出足够多的切向量：用 M 局部的图像参数化，把参数空间 ℝ^{n−k} 中的每条直线推到 M 上，变成一条曲线。这样得到的速度已经有 n−k 维，而核恰好也只有 n−k 维，没有剩余空间。
  - 定义：重排坐标后 p = (a,b)，a ∈ ℝ^{n−k}，b ∈ ℝᵏ。e04 给出开集 A ∋ a，光滑 g: A → B，M ∩ (A×B) = {(x,g(x)) : x ∈ A}；ψ(x) = (x, g(x))。
  - 例子：上半球面 g(x₁,x₂) = √(1 − x₁² − x₂²)，ψ(x) = (x₁, x₂, g(x))。参数平面上过 a 的直线 a + tξ 被推成球面上的曲线。
  - 边界：坐标重排是一个置换，是线性同构，保持核、像与维数，所以不失一般性。ψ 只在 p 附近有定义，因此曲线只对小的 t 有定义，这已足够。
  - 用途：T_pM = ker Dh(p) 把"找切向量"变成"解线性方程组 Dh(p)v = 0"。c06 的球面、c09 的 O(n) 都直接使用这个公式。
- proof_steps：
  1. 由正则性，Dh(p) 的秩为 k，所以有 k 列线性无关；重排坐标使最后 k 列构成的 D_yh(a,b) 可逆（e04）。
  2. 由隐函数定理与正则水平集定理：ψ(x) = (x, g(x)) 在 a 附近参数化 M，ψ(a) = (a, g(a)) = (a, b) = p。
  3. 对任意 ξ ∈ ℝ^{n−k}，A 是开集，所以存在 ε > 0，使 |t| < ε 时 a + tξ ∈ A。令 γ(t) = ψ(a + tξ)。则 γ(t) ∈ M，γ(0) = p，γ 光滑。
  4. 由链式法则，γ'(0) = Dψ(a)ξ。因此 Dψ(a)ξ ∈ T_pM 对所有 ξ 成立，即 im Dψ(a) ⊆ T_pM。
  5. Dψ(a)ξ = (ξ, Dg(a)ξ)。若 Dψ(a)ξ = 0，则第一块 ξ = 0。所以 Dψ(a) 是单射，由 rank–nullity，dim im Dψ(a) = (n−k) − 0 = n−k。
  6. Dh(p) 是 k×n 矩阵，秩为 k，由 rank–nullity，dim ker Dh(p) = n − k。
  7. 结合第一步：im Dψ(a) ⊆ T_pM ⊆ ker Dh(p)。
  8. im Dψ(a) 与 ker Dh(p) 都是子空间，前者包含于后者且维数相同（n−k），由同维引理二者相等。
  9. 夹在两个相等集合之间的 T_pM 也等于它们：T_pM = ker Dh(p) = im Dψ(a)。∎
  10. 推论：T_pM 是 n−k 维向量空间。c02 中悬而未决的加法封闭由此得到。
- necessity：
  - 如果省略步骤 5（不知道 Dψ(a) 单射），只能得到 "T_pM 包含某个子空间"，维数可能不够，夹逼不成立。
  - 步骤 1、2 依赖正则性：没有可逆的 D_yh，就没有 g 和 ψ。c06 专门展示失效情形。
- visual_events：
  - e1｜参数平面推到 M 上｜左：参数平面 ℝ²（网格），点 a；右：S² 上半球，点 p；连接箭头标注 ψ｜网格经 ψ 弯曲贴到上半球面（网格变形动画，变形参数 0→1）｜无｜两侧并排
  - e2｜直线变成曲线｜参数平面中过 a 的 5 条直线 a + tξ（不同颜色）→ 球面上的 5 条曲线 ψ(a+tξ)｜直线先画出，再沿 ψ 映射为曲线｜网格｜曲线保留
  - e3｜速度 = Dψ(a)ξ｜每条直线的方向箭头 ξ（左）→ 对应曲线在 p 的速度箭头（右，橙色）｜箭头同步出现；公式 "γ'(0) = Dψ(a)ξ" 出现｜曲线｜账本加入 "im Dψ(a) ⊆ T_pM"
  - e4｜Dψ(a) 是单射｜公式层：Dψ(a)ξ = (ξ, Dg(a)ξ)，第一块用高亮框标出 "Iₙ₋ₖ block"｜旁边一行 "Dψ(a)ξ = 0 ⇒ ξ = 0 ⇒ dim im = n−k"｜3D 变暗｜账本加入 "dim im Dψ(a) = n−k"
  - e5｜核的维数｜公式 "rank Dh(p) = k ⇒ dim ker Dh(p) = n−k"（引用 c03 卡片）｜淡入｜账本｜账本加入 "dim ker Dh(p) = n−k"
  - e6｜夹逼｜三层嵌套图：外层紫色 ker Dh(p)，中层虚线轮廓 T_pM，内层橙色 im Dψ(a)；每层标注维数｜内层与外层标注同为 n−k 后，内层膨胀、外层收缩，三层合为一个平面（颜色混合为橙紫）｜无｜一个平面，标注 "T_pM = ker Dh(p)"
  - e7｜回到 3D：同一张平面｜S² 上 p 处，橙色切平面与紫色核平面完全重合｜两平面合并闪光一次｜S²｜账本收拢为 "T_pM = ker Dh(p) ∎"
  - e8｜推论：向量空间｜c02 的红色问号 "closed under addition?" 被打勾替换｜淡入｜账本｜章末停留
- outcome_check：观众能写出 im Dψ(a) ⊆ T_pM ⊆ ker Dh(p)，说出两端维数为何都是 n−k，以及为何这推出三者相等。
- source：L3 §5 Thm 4 Step 2；L3 §4 Thm 3 证明（ψ、φ 的构造）；HW p.11（γ̂ = φ∘γ 的图）；BD 9f2199
- next：正则性在步骤 1–2 中被悄悄用到了。去掉它会怎样？

### c06-regularity-and-sphere — 正则性为何必要；球面 T_xSⁿ⁻¹ = x^⊥

- question：观众能用两个例子说明：没有正则性时，ker Dh(p) 可能比真正的切向量集合大，后者甚至可能不是向量空间；并能对球面算出 T_xSⁿ⁻¹ = x^⊥。
- requires：tangent-kernel-equal（c05）、non-regular-sphere、cross-level-set、sphere-level-set（e04）。
- music：counterexample
- teaching_sequence：
  - 直觉：核的大小由 Dh(p) 的秩决定。秩掉下来，核就膨胀，但 M 本身没有变；所以核与切空间脱节。
  - 定义：沿用 T_pM 的曲线定义（对任意子集 M ⊆ ℝⁿ 都可以写出"速度集合"）。
  - 例子 1（同一个集合，坏的方程）：h̃(x) = (xᵀx − 1)²，h̃⁻¹(0) = Sⁿ⁻¹。Dh̃(x)[v] = 2(xᵀx−1)·2xᵀv = 4(xᵀx−1)xᵀv，在球面上恒为 0。所以 ker Dh̃(x) = ℝⁿ，而真正的切空间是 x^⊥（n−1 维）。第一步 T ⊆ ker 依然成立（ℝⁿ 包含一切），但第二步失效：D_y h̃ = 0 不可逆，不存在 g。
  - 例子 2（集合本身坏）：h(x,y) = x² − y²，M = h⁻¹(0) 是两条直线 y = ±x 的并。Dh(0,0) = [0 0]，ker = ℝ²。曲线速度集合：若 γ(t) = (x(t), y(t)) ⊂ M 且 γ(0) = 0，则 |x(t)| = |y(t)|；令 γ'(0) = (u,w)，则 x(t) = ut + o(t)，y(t) = wt + o(t)，两边除以 |t| 并令 t→0 得 |u| = |w|。所以速度只在两条直线 {(s,s)} ∪ {(s,−s)} 上，两条直线本身都可达（直线曲线 t ↦ (t,±t)）。这个速度集合不是向量空间（(1,1)+(1,−1) = (2,0) 不在其中），更不等于 ker = ℝ²。
  - 正面：h(x) = xᵀx，Dh(x)[v] = 2xᵀv，x ≠ 0 所以秩为 1；T_xSⁿ⁻¹ = ker Dh(x) = {v : xᵀv = 0} = x^⊥。不用构造任何球面 chart。
  - 边界：例子 1 说明结论依赖的是"方程 + 正则性"，而不只依赖集合本身。同一个球面，换一个正则的方程就能得到正确答案。
  - 用途：c07 中 O(n) 的陪域选择是同一个教训的矩阵版本：要选让微分满射的方程写法。
- proof_steps：
  1. 例子 1：链式法则 D[(s−1)²](s) = 2(s−1)，结合 D(xᵀx)[v] = 2xᵀv，得 Dh̃(x)[v] = 4(xᵀx−1)xᵀv；在 xᵀx = 1 处为 0，故 ker = ℝⁿ ≠ x^⊥。
  2. 例子 2：如上 |u| = |w| 的极限论证；构造 t ↦ (t, t) 与 t ↦ (t, −t) 说明两条直线都可达；(1,1)+(1,−1) ∉ 集合。
  3. 球面：Dh(x)[v] = d/dt (x+tv)ᵀ(x+tv)|₀ = 2xᵀv；x ∈ Sⁿ⁻¹ ⇒ x ≠ 0 ⇒ 线性泛函非零 ⇒ 秩 1；由 c05，T_xSⁿ⁻¹ = x^⊥，维数 n−1。
- necessity：本章即必要性章节。
- visual_events：
  - e1｜同一个球面，两个方程｜S²；左右两张公式卡 "h = xᵀx" 与 "h̃ = (xᵀx−1)²"｜两卡同时淡入｜无｜两卡并列
  - e2｜好方程：核是切平面｜左卡下方：红色 ∇h(p) = 2p，紫色核平面与橙色切平面重合｜淡入｜S²｜左侧完成
  - e3｜坏方程：梯度消失｜右卡下方：∇h̃(p) 的箭头长度按 4(‖p‖²−1)·2p 计算；动画让一个测试点从球外沿径向接近 p，箭头随之缩短到 0｜S²｜箭头消失
  - e4｜核膨胀成整个空间｜紫色区域从平面膨胀为充满视野的半透明立方体（标注 ker Dh̃(p) = ℝ³）；橙色切平面不变｜S²、切平面｜标注 "kernel too big: 3 ≠ 2"
  - e5｜根源：没有可逆块就没有 g｜公式 "D_y h̃(p) = 0 ⇒ no implicit function g ⇒ step 2 fails"｜淡入｜3D 缩小｜账本加入 "regularity ⇒ kernel has the right size"
  - e6｜交叉点：集合本身就坏｜2D 平面：两条直线 y=±x（青色）；原点处 ker Dh(0) = ℝ²（紫色铺满）｜淡入｜无｜两线
  - e7｜曲线速度只有两条线｜若干条沿直线穿过原点的曲线，速度箭头只落在两条直线上；尝试一条"拐弯"的曲线：在原点处停住（速度 0）再换到另一条线｜动画演示；最后橙色两条直线标注 "velocities"｜紫色背景｜对比框 "{(s,±s)} ≠ ℝ²"
  - e8｜不是向量空间｜箭头 (1,1) 与 (1,−1) 相加得 (2,0)，落在两条线之外，标红叉｜动画平行四边形法则｜两条线｜红叉停留
  - e9｜正面：球面切空间公式｜回到 S²，橙色切平面上的 3 根向量都满足 pᵀv = 0；公式 "T_xSⁿ⁻¹ = x^⊥, dim = n−1"｜p 沿球面移动，切平面随之刚性跟随｜S²｜账本收拢 "T_xSⁿ⁻¹ = x^⊥"
- outcome_check：观众能对 h̃ = (xᵀx−1)² 算出 ker = ℝⁿ 并指出缺了哪一步；能对交叉点说明速度集合不是向量空间；能写出球面切空间。
- source：L3 §5 Running example（球面）；HW p.10–12；h̃ 例子承接 e04（补充，非笔记内容）；交叉点速度集合的分析为补充（非笔记内容）
- next：同样的机器用到矩阵上：O(n)。第一个陷阱是陪域该选哪里。

### c07-on-differential-codomain — O(n)：微分，以及为什么陪域必须是 Sym(n)

- question：观众能算出 F(R) = RᵀR − I 的微分 DF(R)[H] = RᵀH + HᵀR；能解释：如果把陪域取成 ℝ^{n×n}，0 永远不是正则值，定理无法使用；所以陪域必须取 Sym(n)。
- requires：directional-derivative（e03）、regular-value（e04）、regularity-necessity（c06）。
- music：definition
- teaching_sequence：
  - 直觉：RᵀR = I 看起来有 n² 个方程，但第 (i,j) 个方程与第 (j,i) 个是同一个方程（RᵀR 自动对称）。如果把重复的方程也算作独立约束，计数会出错，微分也不可能满射。
  - 定义：O(n) = {R ∈ ℝ^{n×n} : RᵀR = I}。把 ℝ^{n×n} 看成维数为 n² 的欧氏空间，内积为 Frobenius 内积 ⟨A,B⟩ = tr(AᵀB) = Σ AᵢⱼBᵢⱼ。Sym(n) = {S : Sᵀ = S}，Skew(n) = {Ω : Ωᵀ = −Ω}。
  - 例子：n=2 时 RᵀR = [[r₁₁²+r₂₁², r₁₁r₁₂+r₂₁r₂₂],[同上, r₁₂²+r₂₂²]]，非对角的两个条目相同。
  - 边界：Sym(n) 是 ℝ^{n×n} 的线性子空间，取上三角（含对角线）的条目就把它与 ℝ^{n(n+1)/2} 线性同构起来，所以正则水平集定理可以直接套用（陪域是有限维向量空间即可）。
  - 用途：c08 用这个微分证明满射与维数；c09 用它求切空间。
- proof_steps：
  1. 分解：任意 A = (A+Aᵀ)/2 + (A−Aᵀ)/2，前者对称、后者反对称；若 A 同时对称和反对称，则 A = Aᵀ = −A，A = 0。所以 ℝ^{n×n} = Sym(n) ⊕ Skew(n)。
  2. 维数：对称矩阵由对角线及其上方的条目决定，共 n + n(n−1)/2 = n(n+1)/2 个；反对称矩阵的对角线满足 Ωᵢᵢ = −Ωᵢᵢ，所以为 0，由严格上三角决定，共 n(n−1)/2 个。两者之和为 n²，与直和一致。
  3. F 的取值是对称的：(RᵀR − I)ᵀ = RᵀR − I。所以 F: ℝ^{n×n} → Sym(n)，O(n) = F⁻¹(0)。
  4. 微分（方向导数技巧）：F(R+tH) = (R+tH)ᵀ(R+tH) − I = RᵀR − I + t(RᵀH + HᵀR) + t²HᵀH。所以 DF(R)[H] = d/dt F(R+tH)|₀ = RᵀH + HᵀR。
  5. 检查值域：(RᵀH + HᵀR)ᵀ = HᵀR + RᵀH，确实在 Sym(n) 中。
  6. 陪域必要性：若取 F̃: ℝ^{n×n} → ℝ^{n×n}，F̃(R) = RᵀR − I，则 DF̃(R) 的像 ⊆ Sym(n)。而对 n ≥ 2，dim Sym(n) = n(n+1)/2 < n²，所以 DF̃(R) 在任何 R 处都不满射，0 不是 F̃ 的正则值，正则水平集定理对 F̃ 不适用（它并不说明 O(n) 不是流形，只是无法给出结论）。若天真地按 n² 个方程计数，会得到维数 n² − n² = 0，显然是错的（O(2) 包含一整圈旋转）。
- necessity：步骤 6。对应 c06 的教训：结论依赖方程的写法；要让方程的个数等于独立约束的个数。
- visual_events：
  - e1｜矩阵也是空间中的点｜一个 3×3 网格 R（9 个格子，显示数值）飞成 ℝ⁹ 中的一个点（抽象示意：一个高维空间的投影云图上的亮点）｜网格收缩成点｜无｜点与网格并列，标注 "ℝ^{n×n} ≅ ℝ^{n²}, ⟨A,B⟩ = tr(AᵀB)"
  - e2｜对称/反对称分解｜一个随机 3×3 矩阵 A 的网格分裂成两个网格：(A+Aᵀ)/2（蓝色）和 (A−Aᵀ)/2（黄色）｜条目按镜像配对着色，两个网格相加重新合成 A｜无｜三个网格并列
  - e3｜数自由度｜蓝色网格中对角线及上三角的格子亮起（6 = 3·4/2）；黄色网格中对角线变灰为 0，严格上三角亮起（3 = 3·2/2）｜计数器跳动｜三网格｜账本加入 "dim Sym = n(n+1)/2, dim Skew = n(n−1)/2"
  - e4｜RᵀR 自动对称｜n=2 符号网格 RᵀR，(1,2) 与 (2,1) 条目同色闪烁，标注 "same equation"｜淡入｜无｜网格停留
  - e5｜展开求微分｜公式层逐行显示步骤 4：t 的一次项用橙色框出｜逐行淡入｜无｜账本加入 "DF(R)[H] = RᵀH + HᵀR"
  - e6｜错误陪域：像只占一部分｜n² 网格（9 格）作为陪域；DF̃(R)[H] 对 30 个随机 H（固定种子）的结果投射到网格上，只有蓝色"对称"格子被点亮，黄色"反对称"部分始终暗着｜点亮动画｜无｜标注 "image ⊆ Sym(n) ≠ ℝ^{n×n}: never surjective"
  - e7｜错误计数得到 0 维｜计数卡 "n² − n² = 0 ?"，旁边一个正在转动的 2D 旋转圆盘标注 "O(2) contains a whole circle"｜计数卡被红线划掉｜无｜替换为 "F: ℝ^{n×n} → Sym(n)"
  - e8｜正确的陪域｜陪域网格只保留蓝色对称部分，标注 Sym(n)｜淡入｜账本保留｜章末停留
- outcome_check：观众能自己展开 (R+tH)ᵀ(R+tH) 得到微分；能解释陪域取 ℝ^{n×n} 时为何 0 不是正则值。
- source：L3 §6（"The constraint RᵀR − I is symmetric, so the natural codomain is Sym(n)"、Step 1）；HW p.9（h: ℝ^{d×d} → ℝ^{d×d} 被箭头改成 Sym(d)、dh_R[Ṙ] 的极限推导）；BD 6110900d、83af79f4；陪域必要性的论证与 n² 计数为补充（非笔记内容）
- next：在正确的陪域上，证明 DF(R) 满射，从而 O(n) 是流形并算出维数。

### c08-on-surjective-dimension — O(n) 是 n(n−1)/2 维流形

- question：观众能对任意 R ∈ O(n) 和任意 S ∈ Sym(n) 给出 H = ½RS 满足 DF(R)[H] = S，并解释这个 H 是怎么"猜"出来的；能算出 dim O(n) = n(n−1)/2，并用 n = 2、3 检验。
- requires：on-differential、codomain-necessity（c07）、regular-level-set（e04）。
- music：proof
- teaching_sequence：
  - 直觉：要解 RᵀH + HᵀR = S。如果能让 RᵀH 恰好等于 S/2，由于 S 对称，第二项是它的转置，也等于 S/2，和就是 S。而 RᵀH = S/2 ⇔ H = R·S/2，因为 R 的逆就是 Rᵀ。
  - 定义：正则值 = 在水平集上每一点微分都满射。
  - 例子：n=2，R = 旋转 θ，S = [[1,0],[0,0]]，H = ½RS 的显式数值演示，验证 RᵀH + HᵀR = S。
  - 边界：满射性要对 O(n) 中的每个 R 都成立；证明只用到 RᵀR = I，所以处处成立。
  - 用途：维数 n(n−1)/2 将在 c09 中与 Skew(n) 的维数相互印证。
- proof_steps：
  1. 预备：R ∈ O(n) ⇒ RᵀR = I ⇒ R 可逆且 R⁻¹ = Rᵀ ⇒ RRᵀ = I。
  2. 固定 R ∈ O(n)，任取 S ∈ Sym(n)。令 H = ½RS。
  3. RᵀH = ½RᵀRS = ½S。
  4. HᵀR = (½RS)ᵀR = ½SᵀRᵀR = ½Sᵀ = ½S（用 Sᵀ = S 与 RᵀR = I）。
  5. 所以 DF(R)[H] = ½S + ½S = S。DF(R) 满射。
  6. R 是任意的，所以 0 是 F 的正则值。由正则水平集定理，O(n) 是 ℝ^{n×n} 的光滑嵌入子流形。
  7. dim O(n) = dim ℝ^{n×n} − dim Sym(n) = n² − n(n+1)/2 = n(n−1)/2。
  8. 检验：n=2 时维数为 1（一个旋转角）；n=3 时为 3（三个旋转自由度）。
- necessity：
  - 若用了错误的陪域（c07），步骤 5 不可能对所有目标成立（反对称目标不可达）。
  - 步骤 3、4 都用到 R ∈ O(n)：对一般矩阵 R，½RS 不一定是解。这说明满射性只需要在水平集上验证，这正是正则值定义的写法。
- visual_events：
  - e1｜方程 RᵀH + HᵀR = S｜公式卡；左右两个 2×2 网格（S 为蓝色对称）｜淡入｜无｜卡片
  - e2｜猜测：让一半等于 S/2｜S 网格分成两个半透明的 "S/2" 层，标注 RᵀH 与 (RᵀH)ᵀ｜分层动画｜S｜两层
  - e3｜解出 H｜公式 "RᵀH = S/2 ⇒ H = R·S/2 (since R⁻¹ = Rᵀ)"｜淡入｜两层｜账本加入 "R⁻¹ = Rᵀ"
  - e4｜逐行验证｜步骤 3–5 逐行出现，每行用到的事实（RᵀR = I、Sᵀ = S）在账本中闪烁｜逐行淡入｜无｜账本加入 "DF(R) onto ⇒ 0 regular"
  - e5｜数值演示｜n=2，θ = 0.7，S = [[1,0],[0,0]]：显示 R、H 的数值网格，计算 RᵀH + HᵀR，结果网格与 S 逐格比较，误差显示为 "max |error| = 0.000"｜数值滚动出现｜无｜结果网格
  - e6｜维数计数｜条形图：n² 总条长，减去 n(n+1)/2（蓝色），剩下 n(n−1)/2（绿色）｜n 从 2 拨到 3 再到 4，条长随之变化，数字更新为 1、3、6｜无｜账本加入 "dim O(n) = n(n−1)/2"
  - e7｜n=2 检验：一个圆｜2D：一个旋转的坐标架，角度 θ 从 0 转到 2π，标注 "1 parameter"｜转动｜条形图缩小｜章末停留
- outcome_check：观众能自己验证 H = ½RS 是解，并说出 O(3) 的维数为 3 的计算过程。
- source：L3 §6 Step 2 与 Step 3 开头的维数计算；HW p.10 上半（Consider Ṙ = ½RS，dim O(d) = d² − d(d+1)/2）；BD 73bed222、83af79f4；数值演示为补充（非笔记内容）
- next：知道 O(n) 是流形之后，它在 R 处的切空间是什么？

### c09-on-tangent — T_R O(n) = R·Skew(n)：无穷小旋转

- question：观众能由 T_R O(n) = ker DF(R) 推出 T_R O(n) = R·Skew(n)（两个包含方向都给出）；能在 n = 2 时直接对旋转曲线求导，验证速度 = RΩ；能解释 Ωx ⊥ x 的几何含义。
- requires：on-manifold（c08）、tangent-kernel-equal（c05）。
- music：proof
- teaching_sequence：
  - 直觉：在单位圆上，切方向是"把 x 转 90°"。在 O(n) 中，切方向是"把 R 再复合一个无穷小旋转"，而无穷小旋转就是反对称矩阵。
  - 定义：R·Skew(n) = {RΩ : Ωᵀ = −Ω}。
  - 例子：n=2，R(θ) = [[cos θ, −sin θ],[sin θ, cos θ]]。对 t 求导：d/dt R(θ(t)) = θ'·[[−sin θ, −cos θ],[cos θ, −sin θ]] = R(θ)·[[0, −θ'],[θ', 0]]，正好是 R 乘一个反对称矩阵。
  - 边界：R = I 时 T_I O(n) = Skew(n)；一般 R 处是把 Skew(n) 左乘 R 平移过去（R· 是线性同构，所以维数不变）。
  - 用途：E06 中在 O(n)/SO(n) 上做梯度下降时，所有更新方向都在 R·Skew(n) 中。
- proof_steps：
  1. 由 c05 与 c08：T_R O(n) = ker DF(R) = {H : RᵀH + HᵀR = 0}。
  2. （⊆）设 H ∈ ker DF(R)，令 Ω = RᵀH。则 Ωᵀ = HᵀR，所以条件变成 Ω + Ωᵀ = 0，即 Ω ∈ Skew(n)。又 RRᵀ = I，故 H = RRᵀH = RΩ ∈ R·Skew(n)。
  3. （⊇）设 H = RΩ，Ωᵀ = −Ω。则 DF(R)[H] = RᵀRΩ + (RΩ)ᵀR = Ω + ΩᵀRᵀR = Ω + Ωᵀ = 0。
  4. 所以 T_R O(n) = R·Skew(n)。∎
  5. 维数核对：Ω ↦ RΩ 是单射线性映射（R 可逆），所以 dim R·Skew(n) = dim Skew(n) = n(n−1)/2，与 c08 一致。
  6. n=2 直接验证：如上求导，速度 R'(θ) = R(θ)·[[0,−θ'],[θ',0]] ∈ R·Skew(2)。
  7. 几何含义：设 R(t) 是 O(n) 中的曲线，R(0) = I，R'(0) = Ω。点 x 被转到 R(t)x，速度 (R(t)x)'|₀ = Ωx；xᵀΩx = (xᵀΩx)ᵀ = xᵀΩᵀx = −xᵀΩx，所以 xᵀΩx = 0，即 Ωx ⊥ x：每个点都沿垂直于自身的方向运动，这是纯旋转、没有伸缩。
- necessity：
  - 步骤 2 用到 RRᵀ = I（来自方阵的 RᵀR = I）。对非方阵（Stiefel 情形）它不成立，这里不展开，只在画面上用一句话提示"square matrices"。
  - 对比：若 Ω 有对称部分 S，曲线 I + tS 会伸缩向量长度（xᵀ(I+tS)ᵀ(I+tS)x = ‖x‖² + 2t xᵀSx + O(t²)），一阶就离开 O(n)。动画对比"纯旋转"与"带对称部分的变形"。
- visual_events：
  - e1｜从核出发｜公式 "T_R O(n) = ker DF(R) = {H : RᵀH + HᵀR = 0}"｜淡入｜无｜账本加入此式
  - e2｜代换 Ω = RᵀH｜公式逐行：Ω = RᵀH，Ωᵀ = HᵀR，Ω + Ωᵀ = 0｜Ω 的 3×3 网格出现，黄色严格上三角，与下三角镜像取负，对角线为 0｜无｜网格保留
  - e3｜回到 H = RΩ｜公式 "H = RRᵀH = RΩ"；反方向验证一行｜淡入｜账本加入 "T_R O(n) = R·Skew(n) ∎"
  - e4｜n=2 直接求导｜2D：旋转的坐标架 R(θ(t))；右侧公式逐步显示导数，并因式分解为 R(θ)·[[0,−θ'],[θ',0]]｜坐标架转动，两根轴的端点速度箭头（橙色）始终垂直于轴｜无｜速度箭头
  - e5｜Ωx ⊥ x｜单位圆上 12 个点，在 Ω 作用下画出速度箭头 Ωx（全部切于圆）｜箭头淡入；推导 xᵀΩx = 0 出现｜无｜账本加入 "Ωx ⊥ x"
  - e6｜对比：有对称部分就会伸缩｜同一组点在 I + tS 下的速度箭头（有径向分量），圆变成椭圆｜两边并排；左侧圆刚性旋转，右侧圆变成椭圆｜无｜标注 "symmetric part = stretching, leaves O(n)"
  - e7｜维数核对｜文字 "Ω ↦ RΩ injective ⇒ dim = n(n−1)/2 ✓（matches c08）"｜淡入｜账本｜章末停留
- outcome_check：观众能独立推出 RᵀH + HᵀR = 0 ⇔ H = RΩ，并解释为何反对称矩阵描述无穷小旋转。
- source：L3 §6 Step 3；HW p.13 上半（Ṙ = RΩ，T_R(O(d)) = {RΩ | Ω antisymmetric}）；BD 9f2199 左中（RᵀṘ = −ṘᵀR，Ṙ = RΩ）；n=2 求导、Ωx ⊥ x 与对称部分的对比为补充（非笔记内容）
- next：O(n) 包含反射。我们关心的旋转群 SO(n) 是什么样的，它有几个自由度？

### c10-so3-and-bridge — SO(n)、SO(3) 的三个自由度，以及下一步

- question：观众能证明 det R ∈ {±1}，并解释为什么 SO(n) 继承 O(n) 的流形结构、切空间和维数；能把 SO(3) 的 3 维对应到三个旋转生成元；能说出 E06 要回答的两个问题。
- requires：on-tangent（c09）；连续函数的保号性（受众已知）；E01 中开集、连续的概念。
- music：recap
- teaching_sequence：
  - 直觉：O(n) 由两块组成：行列式为 +1 的旋转，和行列式为 −1 的"旋转加一次反射"。行列式是连续的，在 ±1 之间不能跳跃，所以两块彼此分离，局部上各自就是 O(n)。
  - 定义：SO(n) = {R ∈ O(n) : det R = 1}。
  - 例子：O(2) = 两个不相交的圆：旋转 R(θ) 和反射 R(θ)·diag(1,−1)。SO(3) 的生成元为 L_x = [[0,0,0],[0,0,−1],[0,1,0]]、L_y = [[0,0,1],[0,0,0],[−1,0,0]]、L_z = [[0,−1,0],[1,0,0],[0,0,0]]，任意 Ω = ω₁L_x + ω₂L_y + ω₃L_z，并且 Ωv = ω × v。
  - 边界：SO(n) 与 O(n) 在 det = 1 的点附近完全相同；"局部相同"就足以推出切空间和维数相同，这个结论不依赖于 SO(n) 是否连通（连通性这里不讨论）。
  - 用途：机器人、视觉中的位姿优化都在 SO(3) 上进行；E06 将在这类流形上定义梯度和 retraction。
- proof_steps：
  1. det R ∈ {±1}：(det R)² = det(Rᵀ)det(R) = det(RᵀR) = det I = 1。
  2. det: ℝ^{n×n} → ℝ 是条目的多项式，因而连续。
  3. 取 R₀ ∈ SO(n)。由连续性，存在 R₀ 的开邻域 W ⊆ ℝ^{n×n}，使 W 上 det > 0。于是 W ∩ O(n) 中所有点的行列式只能是 +1，即 W ∩ O(n) ⊆ SO(n)。
  4. 所以 SO(n) 在 O(n) 中是开集（同理 det = −1 的部分也是开集，因此 SO(n) 也是闭集）。O(n) 在 R₀ 附近的 chart 限制到 W ∩ O(n) 上，就是 SO(n) 的 chart。
  5. 切向量由 R₀ 附近的曲线定义，而这些曲线（对小的 t）既在 O(n) 中也在 SO(n) 中，所以 T_R SO(n) = T_R O(n) = R·Skew(n)，dim SO(n) = n(n−1)/2。
  6. n=3：dim = 3。Skew(3) 的基为 L_x、L_y、L_z；Ω = ω₁L_x + ω₂L_y + ω₃L_z 满足 Ωv = ω × v（逐分量验证：Ωv = (ω₂v₃ − ω₃v₂, ω₃v₁ − ω₁v₃, ω₁v₂ − ω₂v₁)）。所以在单位元处的切向量就是"绕 ω 轴、以角速度 ‖ω‖ 转动"。
- necessity：
  - 反射 diag(1,1,−1) ∈ O(3) 但不在 SO(3) 中；动画显示镜像后的坐标架无法连续转回原坐标架（行列式需要从 −1 跳到 +1）。这只作为直观演示，不作为连通性的证明。
  - 如果不验证"局部相同"，就不能直接把 O(n) 的结论搬到 SO(n) 上；步骤 3 正是这个桥梁。
- visual_events：
  - e1｜行列式只能是 ±1｜公式 "(det R)² = det(RᵀR) = 1"｜淡入｜无｜账本加入 "det R = ±1"
  - e2｜O(2) 是两个圆｜3D 示意：O(2) 用两个不相交的圆环表示（参数 θ），一个标注 det = +1（旋转），一个标注 det = −1（反射）；旁边 2D 坐标架随所选点变化｜点在 +1 圆上转动，坐标架旋转；跳到 −1 圆时，坐标架被镜像｜无｜两个圆
  - e3｜行列式不能跳｜一条从 +1 圆到 −1 圆的假想路径，下方画 det 沿路径的取值曲线；连续曲线需要穿过 0，而 det = 0 的矩阵不在 O(n) 中，路径在中间断开（红色）｜无｜两个圆｜账本加入 "SO(n) open & closed in O(n)"
  - e4｜局部相同 ⇒ 切空间相同｜R₀ 附近的小邻域 W 在两个集合中重合，标注 "T_R SO(n) = R·Skew(n)"｜邻域高亮｜无｜账本加入 "dim SO(n) = n(n−1)/2"
  - e5｜SO(3) 的三个生成元｜3D 坐标架（红、绿、蓝三轴）；三张 3×3 网格 L_x、L_y、L_z 依次出现，每出现一张，坐标架就绕对应的轴转动 90° 再转回｜依次演示｜无｜三张网格排成一排
  - e6｜Ωv = ω × v｜坐标架绕一个斜轴 ω（白色箭头）匀速转动；架上若干点的速度箭头 Ωv 与 ω × v 对比，二者重合｜转动｜生成元网格缩小｜屏幕文字 "3 = three rotational degrees of freedom"
  - e7｜R 处的速度 RΩ｜坐标架先处于某个姿态 R，再叠加小转动 Ω，速度 RΩ 用架子三轴端点的橙色箭头表示｜转动｜无｜箭头保留
  - e8｜回顾本集｜一张总图：c02 曲线定义 → c04/c05 夹逼 → c06 正则性 → c07 陪域 → c08 维数 → c09 R·Skew(n)｜各节点依次点亮｜无｜总图
  - e9｜过渡到 E06｜S² 上 p 处的橙色切平面，以及 SO(3) 上的坐标架；两个问号："Which direction?"（切平面中出现多根候选箭头）与 "How to move and stay on M?"（沿箭头直走会离开球面）｜淡入｜总图淡出｜章末停留 3 秒
- outcome_check：观众能说出 SO(3) 的维数为 3 的两种理由（公式 n(n−1)/2，以及三个生成元/三根旋转轴），并能说出 E06 的两个问题。
- source：L3 §6 Step 4（SO(n)，det 连续，dim SO(3) = 3）；HW p.5（SO(d) 定义，笔记中误写为 det = ±1，正确为 +1）；HW p.13 下半（First Order Riemannian Geometry："① How to figure out which direction to move ② How to move"）；生成元、Ωv = ω × v、O(2) 两个圆的示意为补充（非笔记内容）
- next：E06——用微分、对偶空间和黎曼度量选出方向（黎曼梯度），并用 retraction 在 M 上移动。

## Glossary additions

| id | en | zh | symbol | spoken |
|---|---|---|---|---|
| tangent-vector | tangent vector | 切向量 | v = γ'(0) | tangent vector |
| smooth-curve | smooth curve | 光滑曲线 | γ | gamma |
| image-linear | image (range) of a linear map | 像（值域） | im A | image of A |
| rank | rank | 秩 | rank A | rank |
| graph-parametrization | graph parametrization | 图像参数化 | ψ(x) = (x, g(x)) | psi of x equals x comma g of x |
| frobenius-inner-product | Frobenius inner product | 弗罗贝尼乌斯内积 | ⟨A,B⟩ = tr(AᵀB) | trace of A transpose B |
| determinant | determinant | 行列式 | det R | determinant of R |
| infinitesimal-rotation | infinitesimal rotation | 无穷小旋转 | Ω ∈ Skew(n) | omega |
| rotation-generator | rotation generator | 旋转生成元 | L_x, L_y, L_z | L x, L y, L z |
| direct-sum | direct sum | 直和 | ⊕ | direct sum |

旁白读法提示（供 P2 使用）：RᵀR 读作 "R transpose R"；RᵀH + HᵀR 读作 "R transpose H plus H transpose R"；Sⁿ⁻¹ 读作 "S n minus one"；x^⊥ 读作 "x perp"，首次出现时说 "the orthogonal complement of x"；n(n−1)/2 读作 "n times n minus one, over two"。

## 估计时长

| 章 | 估计分钟 |
|---|---|
| c01-why-directions | 2.5 |
| c02-tangent-by-curves | 4 |
| c03-rank-nullity | 3.5 |
| c04-kernel-contains-tangent | 3 |
| c05-tangent-equals-kernel | 5 |
| c06-regularity-and-sphere | 5 |
| c07-on-differential-codomain | 4.5 |
| c08-on-surjective-dimension | 3.5 |
| c09-on-tangent | 4.5 |
| c10-so3-and-bridge | 4.5 |
| 合计 | 约 40 |
