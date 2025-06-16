uniform sampler2D sampler;
varying vec2 v_uv;

void main() {
    vec4 inputColor = texture2D(sampler, v_uv);
    gl_FragColor = inputColor;
}