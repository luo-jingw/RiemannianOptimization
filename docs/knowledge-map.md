# Knowledge Map — EECE7223 Riemannian Optimization (through connections and geodesics)

Scope: course material in `notes/` through connections, geodesics, the exponential map and parallel transport, with
Boumal Chapter 4 (first-order algorithms) and the matching parts of Chapters 5 and 10.
Sources:

| Tag | File |
|---|---|
| L2 | `notes/Lecture_notes_export (1).zip` → `Lecture 02 - Smooth Manifolds.pdf` |
| L3 | `notes/Lecture_notes_export (1).zip` → `Lecture 03 - Embedded Submanifolds.pdf` (titled "From Abstract Manifolds to Regular Level Sets") |
| HW | `notes/笔记 2026年9月15日.pdf` (16 handwritten pages) |
| BD | `notes/*.jpg` (14 blackboard photos) |
| RU | `notes/Rudin Contraction Mapping and Inverse Function Theorems.pdf` (Rudin, PMA §9.22–9.29) |
| BM4 | `notes/07/IntroOptimManifolds_Boumal_2022.pdf`, Chapter 4 (PDF pages 69–98); section and theorem numbers follow the published book |
| N8 | `notes/08/笔记 2026年9月15日(2).pdf` pp. 22–30 and the blackboard photos in `notes/08/` |
| BM5, BM10 | the same book, §5.1–5.8, §5.10 and §10.2–10.3 |

## 1. The one-sentence goal

Minimize f(x) where x is constrained to a curved space M.
Every step of Riemannian gradient descent needs two answers:

1. **Which direction to move** → tangent space + Riemannian metric + differential → Riemannian gradient.
2. **How to move without leaving M** → retraction.

Everything before these two answers exists to make "direction", "tangent", "smooth" and "derivative" meaningful on M.

## 2. Dependency tree

```
Second-order geometry (toward the Riemannian Hessian Hess f(x)[u] = ∇_u grad f)   [N8, BM5 Def 5.14]
├── parallel transport Π_γ: D/dt Z = 0; linear isometry; path-dependent  [N8 p30, BM10 Def 10.35, Prop 10.36]
├── exponential map Exp_x(tv) = γ_v(t); a second-order retraction      [N8 p29-30, BM10 Def 10.16, Prop 10.18]
├── geodesic ∇_γ̇ γ̇ = 0; coordinates ẍ^k + Γ^k_ij ẋⁱẋ^j = 0; unique for given (x, v)  [N8 p29-30, BM5 Def 5.38]
│   └── covariant derivative along curves D/dt; on a submanifold D/dt Z = Proj(Ż)  [BM5 Thm 5.29, Prop 5.31]
├── submanifold Levi-Civita connection ∇_v X = Proj_p(DX̄(p)[v])        [N8 p28-29, BM5 Thms 5.2, 5.8, 5.9]
├── fundamental theorem: ∃! compatible, torsion-free connection (Koszul formula)  [N8 p28, BM5 Thm 5.6]
│   ├── compatibility X⟨Y,Z⟩ = ⟨∇_X Y,Z⟩ + ⟨Y,∇_X Z⟩
│   └── torsion-free ∇_X Y − ∇_Y X = [X,Y]; in coordinates Γ^k_ij = Γ^k_ji
├── affine connection: C^∞-linear in the direction, ℝ-linear in the field, Leibniz; Christoffel symbols  [N8 p25-26, BM5 Def 5.20]
└── vector fields act on functions; Lie bracket, = DY[X] − DX[Y] in ℝⁿ  [BM5 Def 5.5, Prop 5.10]
Riemannian gradient descent: x_{k+1} = R_x(-α grad f(x))           [BM4 §4.3]
├── local rate: grad f(x*) = 0, Hess f(x*) ≻ 0, step 1/L, L > λmax/2 ⇒ linear; L = λmax ⇒ factor 1 − 1/κ  [BM4 Thm 4.20]
│   └── local contraction mapping: ‖DF(x*)‖ < 1 ⇒ linear, = 0 ⇒ quadratic   [BM4 Thm 4.19]
│       └── retraction is a local diffeomorphism near 0 (inverse function theorem on manifolds)  [BM4 Thm 4.16, Cor 4.17-4.18]
├── backtracking (Armijo): α ≥ min(ᾱ, 2τ(1−r)/L) without knowing L   [BM4 §4.5, Lemma 4.12, Cor 4.13]
├── Lipschitz-type condition A4.3: f(R_x(s)) ≤ f(x) + ⟨grad f(x), s⟩ + L/2 ‖s‖²  [BM4 §4.4]
│   ├── step in (0, 2/L) ⇒ sufficient decrease; step 1/L ⇒ K ≥ 2L(f(x₀) − f_low)/ε²  [BM4 Prop 4.8, Cor 4.9]
│   └── Euclidean origin: Lipschitz gradient ⇒ quadratic upper bound
├── sufficient decrease A4.2 + lower bound A4.1 ⇒ ‖grad f(x_k)‖ → 0, accumulation points critical  [BM4 Prop 4.7]
├── critical point: (f∘c)'(0) ≥ 0 for all curves ⇔ grad f(x) = 0; local min ⇒ critical  [BM4 §4.2]
├── first-order Taylor along curves; pullback f∘R_x on T_xM           [BM4 §4.1]
└── computing gradients (Df → adjoint → grad) and the log–log gradient check  [BM4 §4.7-4.8]
├── Retraction R_x : T_xM → M,  R_x(0)=x,  d(R_x)_0 = id            [HW p15-16, BD]
│   └── consequence: γ(t)=R_x(tv) ⇒ γ(0)=x, γ'(0)=v
├── Riemannian gradient grad f(x) = (df_x)^♯                         [HW p15, BD]
│   ├── descent property: d/dt f(R_x(-t grad f))|₀ = -‖grad f(x)‖²_x  [BD]
│   ├── Riemannian metric g_x : T_xM × T_xM → ℝ, smooth in x         [HW p14]
│   ├── Riesz representation: v ↦ ⟨v,·⟩ is an isomorphism X ≅ X*      [HW p14]
│   │   └── dual space X* = {linear ℓ : X → ℝ}
│   └── differential df_x : T_xM → T_{f(x)}N; for N=ℝ, df_x ∈ (T_xM)*  [HW p11, p13, BD]
│       └── defined by curves: df_x[γ'(0)] = (f∘γ)'(0)
└── Tangent space T_xM                                                [L3 §5, HW p10-12]
    ├── definition: velocities γ'(0) of curves γ in M through x
    ├── theorem: T_xM = ker Dh(x) for a regular level set M = h⁻¹(c)
    │   ├── ⊆ : differentiate h(γ(t)) ≡ c
    │   └── ⊇ : graph parametrization ψ(x)=(x,g(x)) + rank–nullity
    ├── example: T_x S^{n-1} = x^⊥
    └── example: T_R O(n) = R·Skew(n)                                 [L3 §6, HW p9-10, p13, BD]
        └── Embedded submanifold via Regular Level-Set Theorem        [L3 §4, HW p8, BD]
            ├── regular value: Dh(x) surjective for all x ∈ h⁻¹(c)
            ├── conclusion: h⁻¹(c) is an (n−k)-dim embedded submanifold
            └── Implicit Function Theorem                             [L3 §3, HW p6-8, RU 9.28]
                ├── proof: apply IFT to F(x,y) = (x, f(x,y))
                ├── Dg = −(D_y f)⁻¹ D_x f
                └── Inverse Function Theorem                          [L3 §2, HW p6, BD, RU 9.24]
                    ├── DF(x₀) invertible ⇒ F is a local diffeomorphism
                    └── proof in Rudin: contraction mapping principle  [RU 9.22-9.23]
        └── Smooth manifold (intrinsic definition)                    [L2 §5-8, L3 §1, HW p2-4, BD]
            ├── smooth map: ψ∘F∘φ⁻¹ smooth; diffeomorphism
            ├── smooth atlas: transition maps ψ∘φ⁻¹ are C^∞
            ├── chart (U, φ): homeomorphism onto open subset of ℝ^d
            └── topological manifold: Hausdorff, second countable, locally ≅ ℝ^d
                └── Topology                                          [L2 §1-4, HW p1-2, BD]
                    ├── topology: ∅, X; arbitrary unions; finite intersections
                    ├── convergence: every open U ∋ x eventually contains x_k
                    ├── continuity: preimage of open is open (⇔ ε-δ for metric spaces)
                    └── homeomorphism: bijective, continuous, continuous inverse
```

## 3. Prerequisite layer

These are assumed by the lectures. A gap here makes every later step feel opaque.

| Area | Concept | Used at |
|---|---|---|
| Linear algebra | rank, kernel, image, rank–nullity | regular value, T_xM = ker Dh, dimension counting |
| Linear algebra | block lower-triangular matrix invertible iff diagonal blocks invertible | IFT ⇒ ImplicitFT proof |
| Linear algebra | Sym(n), Skew(n), dimensions n(n+1)/2 and n(n−1)/2 | O(n) dimension and tangent space |
| Linear algebra | inner product, Frobenius ⟨A,B⟩ = tr(AᵀB), dual space, Riesz | Riemannian metric, gradient |
| Multivariable calculus | derivative as best linear approximation F(x+h) = F(x) + DF(x)h + o(‖h‖) | IFT intuition |
| Multivariable calculus | directional derivative DF(x)[v] = d/dt F(x+tv)\|₀ | every differential computation |
| Multivariable calculus | chain rule, Jacobian matrix | tangent-space proof, ImplicitFT derivative |
| Analysis | metric space, open ball, ε-δ continuity | topology examples |
| Analysis | completeness, contraction mapping (Banach fixed point) | proof of IFT (Rudin) |

## 4. Recommended learning path

Each stage answers one question and produces one tool used by the next.

| Stage | Question | Tool produced | Key example |
|---|---|---|---|
| 0 | What does the problem look like? | min f(x) s.t. x ∈ M | sphere, rotations SO(3) |
| 1 | How to talk about "nearby" without coordinates? | topology, continuity, homeomorphism | metric topology on ℝⁿ |
| 2 | What is "locally looks like ℝ^d"? | chart, topological manifold | S¹ with φ(x,y)=x on the upper half |
| 3 | When can we do calculus on it? | smooth atlas, transition maps, smooth maps | two overlapping charts on S¹ |
| 4 | Charts are hard to guess — can equations make them for us? | IFT → ImplicitFT | x²+y²=1 solved as y = √(1−x²) |
| 5 | Which equation sets are manifolds? | regular level-set theorem, dim = n − k | S^{n−1}, O(n) |
| 6 | What directions can we move in? | T_xM = ker Dh(x) | x^⊥, R·Skew(n) |
| 7 | How does f change along a direction? | differential df_x | f∘γ |
| 8 | Which direction is steepest? | metric g_x, Riesz, grad f = (df_x)^♯ | −‖grad f‖² < 0 |
| 9 | How to step and stay on M? | retraction | normalization x+v ↦ (x+v)/‖x+v‖ on the sphere |
| 10 | What does repeating the step achieve, and how fast? | Riemannian gradient descent, step-size rules, rates | Rayleigh quotient ½xᵀAx on S² |
| 11 | How to differentiate a vector field, go straight, and carry vectors? | Levi-Civita connection, geodesics, Exp, parallel transport | great circles on S², polar coordinates on ℝ² |

## 5. Two running examples across all stages

| Stage | Sphere S^{n−1} | Orthogonal group O(n) |
|---|---|---|
| Defining equation | h(x) = xᵀx = 1 | F(R) = RᵀR − I = 0, F : ℝ^{n×n} → Sym(n) |
| Differential | Dh(x)[v] = 2xᵀv | DF(R)[H] = RᵀH + HᵀR |
| Regular value check | x ≠ 0 ⇒ rank 1 | H = ½RS solves DF(R)[H] = S |
| Dimension | n − 1 | n² − n(n+1)/2 = n(n−1)/2 |
| Tangent space | {v : xᵀv = 0} | {RΩ : Ωᵀ = −Ω} |
| Special case | S² ⊂ ℝ³ | SO(3): det R = +1, dimension 3 |

## 6. Corrections to handwritten notes and board

| Location | Written | Correct |
|---|---|---|
| HW p5 | S² ⊆ ℝ² | S² ⊆ ℝ³ |
| HW p5 | SO(d): det R = ±1 | det R = +1; det R = ±1 describes O(d) |
| HW p6 | F(x+h) = F(x) + dF h + o(‖h‖²) | remainder is o(‖h‖) |
| HW p8 | X = (u,v) ∈ ℝ^{n+k} × ℝ^k | ℝ^{n−k} × ℝ^k |
| BD (regular level-set theorem) | submanifold of ℝ^k | submanifold of ℝⁿ, dimension n − k |
| HW p8 | D[f(x,g(x))] = d_x f + d_x f · dg | D_x f + D_y f · Dg = 0 |
| HW p16 | γ̇(t) = d/dt\|_{t=0} R_x(tv) | γ̇(0) = d/dt\|_{t=0} R_x(tv) |
| N8 p25 | "what is the dimensions of this vector field" | what is the derivative of this vector field (the acceleration) |
| N8 p26 | "ℝ-linearity in field being" | ℝ-linearity in the field being differentiated |
| N8 p28 | M ⊆ ℝⁿ "with inherent metric" | with the induced (embedded) metric |
| N8 p29 | ∇_v X = Proj_x(DX̄(p)[v]) | Proj_p (projection at the base point p) |
| N8 p30 | geodesics "devirited" by γ_v(0)=x, γ̇_v(0)=v | determined by |

## 7. Course frontier

Covered so far: tangent spaces, the Riemannian gradient and retractions; Riemannian gradient descent with its global
and local guarantees (BM4); connections, the Levi-Civita connection, geodesics, the exponential map and parallel
transport (N8).
Not yet covered: the Riemannian Hessian in depth, Newton and trust-region methods, vector transporters for CG and BFGS.
