precision highp float;

varying vec3 vl;
varying vec2 vuv;

attribute vec3 p;
attribute vec2 uv;
attribute vec3 n;

uniform vec3 cam;
uniform float l[7 * 32];

const mat4 v = mat4(1, 0, 0, 0, 0, 0.707, 0.707, 0, 0, -0.707, 0.707, 0, 0, -22.627, -22.627, 1); // view
const mat4 r = mat4(0.977, 0, 0, 0, 0, 1.303, 0, 0, 0, 0, -1, -1, 0, 0, -2, 0); // projection

void main(void) {
  vl = vec3(0.3, 0.3, 0.6); // ambient color

  for (int i = 0; i < 32; i++) {
    vec3 lp = vec3(l[i * 7], l[i * 7 + 1], l[i * 7 + 2]); // light position

    vl += vec3(l[i * 7 + 3], l[i * 7 + 4], l[i * 7 + 5]) // light color *
      * max(dot(n, normalize(lp - p)), 0.0) // diffuse *
      * (1.0 / (l[i * 7 + 6] * ( // attentuation *
        length(lp - p) // distance
      )));
  }

  vuv = uv;
  gl_Position = r * v * (vec4(p + cam, 1.0));
}
