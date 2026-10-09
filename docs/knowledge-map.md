# Knowledge Map — EECE7223 Riemannian Optimization (through first-order geometry)

Scope: course material in `notes/` up to the definition of a retraction.
Sources:

| Tag | File |
|---|---|
| L2 | `notes/Lecture_notes_export (1).zip` → `Lecture 02 - Smooth Manifolds.pdf` |
| L3 | `notes/Lecture_notes_export (1).zip` → `Lecture 03 - Embedded Submanifolds.pdf` (titled "From Abstract Manifolds to Regular Level Sets") |
| HW | `notes/笔记 2026年9月15日.pdf` (16 handwritten pages) |
| BD | `notes/*.jpg` (14 blackboard photos) |
| RU | `notes/Rudin Contraction Mapping and Inverse Function Theorems.pdf` (Rudin, PMA §9.22–9.29) |

## 1. The one-sentence goal

Minimize f(x) where x is constrained to a curved space M.
Every step of Riemannian gradient descent needs two answers:

1. **Which direction to move** → tangent space + Riemannian metric + differential → Riemannian gradient.
2. **How to move without leaving M** → retraction.

Everything before these two answers exists to make "direction", "tangent", "smooth" and "derivative" meaningful on M.

## 2. Dependency tree

```
Riemannian gradient descent: x_{k+1} = R_x(-α grad f(x))           [next topic, not yet in notes]
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

## 7. Course frontier

Covered so far: up to the definition of a retraction and the descent property of −grad f.
Not yet in the notes: retraction examples, Riemannian gradient on embedded submanifolds, Riemannian gradient descent algorithm.
