// beyondBINARY quantum-prefixed | uvspeed | luvukid0 | OpenQASM 2.0
// Message: luvukid0FreyaErikaJinxSwillieMrCookieStellaAddieTRE
// Each character encoded as Rz(charCode/128 * pi) rotation
// 5 qubits, 50 characters distributed across qubits round-robin
// Backend: ibm_marrakesh | Heron r2 | 156 qubits
OPENQASM 2.0;
include "qelib1.inc";
qreg q[5];
creg c[5];

// ── Layer 0: Initialize all qubits to superposition ──
h q[0]; h q[1]; h q[2]; h q[3]; h q[4];

// ── Layer 1: Character rotations (charCode/128 * pi) ──
// Each char → Rz on qubit (index % 5)
// l=108 u=117 v=118 u=117 k=107 i=105 d=100 0=48
// F=70  r=114 e=101 y=121 a=97  E=69  r=114 i=105
// k=107 a=97  J=74  i=105 n=110 x=120 S=83  w=119
// i=105 l=108 l=108 i=105 e=101 M=77  r=114 C=67
// o=111 o=111 k=107 i=105 e=101 S=83  t=116 e=101
// l=108 l=108 a=97  A=65  d=100 d=100 i=105 e=101
// T=84  R=82  E=69

// "luvukid0FreyaErikaJinxSwillieMrCookieStellaAddieTRE"
//  q0    q1    q2    q3    q4   (round-robin)

// l → q0  (108/128*π = 2.6507)
rz(2.6507) q[0];
// u → q1  (117/128*π = 2.8717)
rz(2.8717) q[1];
// v → q2  (118/128*π = 2.8962)
rz(2.8962) q[2];
// u → q3  (117/128*π = 2.8717)
rz(2.8717) q[3];
// k → q4  (107/128*π = 2.6262)
rz(2.6262) q[4];

// i → q0  (105/128*π = 2.5770)
rz(2.5770) q[0];
// d → q1  (100/128*π = 2.4544)
rz(2.4544) q[1];
// 0 → q2  (48/128*π = 1.1781)
rz(1.1781) q[2];
// F → q3  (70/128*π = 1.7180)
rz(1.7180) q[3];
// r → q4  (114/128*π = 2.7980)
rz(2.7980) q[4];

// ── Entanglement: bind the names together ──
cz q[0],q[1];  // l-u bond
cz q[1],q[2];  // u-v bond
cz q[2],q[3];  // v-u bond
cz q[3],q[4];  // u-k bond
cz q[0],q[4];  // circular closure

// e → q0  (101/128*π = 2.4789)
rz(2.4789) q[0];
// y → q1  (121/128*π = 2.9698)
rz(2.9698) q[1];
// a → q2  (97/128*π = 2.3808)
rz(2.3808) q[2];
// E → q3  (69/128*π = 1.6935)
rz(1.6935) q[3];
// r → q4  (114/128*π = 2.7980)
rz(2.7980) q[4];

// i → q0  (105/128*π = 2.5770)
rz(2.5770) q[0];
// k → q1  (107/128*π = 2.6262)
rz(2.6262) q[1];
// a → q2  (97/128*π = 2.3808)
rz(2.3808) q[2];
// J → q3  (74/128*π = 1.8162)
rz(1.8162) q[3];
// i → q4  (105/128*π = 2.5770)
rz(2.5770) q[4];

// ── Entanglement: bind Freya-Erika-Jinx ──
cz q[0],q[2];
cz q[1],q[3];
cz q[2],q[4];

// n → q0  (110/128*π = 2.6998)
rz(2.6998) q[0];
// x → q1  (120/128*π = 2.9452)
rz(2.9452) q[1];
// S → q2  (83/128*π = 2.0372)
rz(2.0372) q[2];
// w → q3  (119/128*π = 2.9207)
rz(2.9207) q[3];
// i → q4  (105/128*π = 2.5770)
rz(2.5770) q[4];

// l → q0  (108/128*π = 2.6507)
rz(2.6507) q[0];
// l → q1  (108/128*π = 2.6507)
rz(2.6507) q[1];
// i → q2  (105/128*π = 2.5770)
rz(2.5770) q[2];
// e → q3  (101/128*π = 2.4789)
rz(2.4789) q[3];
// M → q4  (77/128*π = 1.8899)
rz(1.8899) q[4];

// ── Entanglement: bind Swillie-MrCookie ──
cz q[0],q[3];
cz q[1],q[4];
cz q[2],q[0];

// r → q0  (114/128*π = 2.7980)
rz(2.7980) q[0];
// C → q1  (67/128*π = 1.6444)
rz(1.6444) q[1];
// o → q2  (111/128*π = 2.7244)
rz(2.7244) q[2];
// o → q3  (111/128*π = 2.7244)
rz(2.7244) q[3];
// k → q4  (107/128*π = 2.6262)
rz(2.6262) q[4];

// i → q0  (105/128*π = 2.5770)
rz(2.5770) q[0];
// e → q1  (101/128*π = 2.4789)
rz(2.4789) q[1];
// S → q2  (83/128*π = 2.0372)
rz(2.0372) q[2];
// t → q3  (116/128*π = 2.8471)
rz(2.8471) q[3];
// e → q4  (101/128*π = 2.4789)
rz(2.4789) q[4];

// ── Entanglement: bind Stella-Addie ──
cz q[0],q[1];
cz q[2],q[3];
cz q[3],q[4];

// l → q0  (108/128*π = 2.6507)
rz(2.6507) q[0];
// l → q1  (108/128*π = 2.6507)
rz(2.6507) q[1];
// a → q2  (97/128*π = 2.3808)
rz(2.3808) q[2];
// A → q3  (65/128*π = 1.5953)
rz(1.5953) q[3];
// d → q4  (100/128*π = 2.4544)
rz(2.4544) q[4];

// d → q0  (100/128*π = 2.4544)
rz(2.4544) q[0];
// i → q1  (105/128*π = 2.5770)
rz(2.5770) q[1];
// e → q2  (101/128*π = 2.4789)
rz(2.4789) q[2];
// T → q3  (84/128*π = 2.0617)
rz(2.0617) q[3];
// R → q4  (82/128*π = 2.0126)
rz(2.0126) q[4];

// ── Final entanglement: close the loop ──
cz q[0],q[4];
cz q[1],q[3];
cz q[0],q[2];

// E → q0  (69/128*π = 1.6935)  — final character
rz(1.6935) q[0];

// ── Measure all ──
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
measure q[3] -> c[3];
measure q[4] -> c[4];
