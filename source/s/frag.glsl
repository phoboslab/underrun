precision highp float;

varying vec3 vl;
varying vec2 vuv;

uniform sampler2D s;

void main(void) {
  vec4 t = texture2D(s, vuv);

  if (t.a < 0.8) {
    // 1) discard alpha
    discard;
  }

  if (t.r > 0.95 && t.g > 0.25 && t.b == 0.0) {
    // 2) red glowing spider eyes
    gl_FragColor = t;
  } else {
    // 3) calculate color with lights and fog
    gl_FragColor = t * vec4(vl, 1.0);

    gl_FragColor.rgb *= smoothstep(
      112.0, 16.0, // fog far, near
      gl_FragCoord.z / gl_FragCoord.w // fog depth
    );
  }

  // reduce colors to ~256
  gl_FragColor.rgb = floor(gl_FragColor.rgb * 6.35) / 6.35;
}
