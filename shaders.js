const OBJECT_VSHADER_SRC=String.raw`
attribute vec4 a_Position;
attribute vec4 a_Color;
attribute vec4 a_Normal;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_ModelMatrix;

uniform vec3 u_AmbientLight;
uniform vec3 u_LightDirection;
uniform vec3 u_PointLightColor;
uniform vec3 u_PointLightPosition;
varying vec4 v_Color;

void main() {
  vec3 ambient = u_AmbientLight * a_Color.rgb;
  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
  float nDotL = max(dot(normal, u_LightDirection), 0.0);
  vec3 diffuse = a_Color.rgb * nDotL;
  vec4 vertexPosition = u_ModelMatrix * a_Position;
  vec3 lightDirection = normalize(u_PointLightPosition-vec3(vertexPosition));
  float nDotL_PointLight = max(dot(normal, lightDirection), 0.0);
  vec3 diffuse_PointLight = u_PointLightColor * a_Color.rgb * nDotL_PointLight;
  
  gl_Position = u_MvpMatrix * a_Position;
  v_Color = vec4(ambient+diffuse+diffuse_PointLight , a_Color.a);
}`;

const OBJECT_FSHADER_SRC=String.raw`
precision mediump float;
varying vec4 v_Color;
void main() {
  gl_FragColor = v_Color;
}`;

const TEXTURED_VSHADER_SRC=String.raw`
attribute vec4 a_Position;
uniform mat4 u_MvpMatrix;
attribute vec2 a_TexCoord;
varying vec2 v_TexCoord;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  v_TexCoord = a_TexCoord;
}`;

const TEXTURED_FSHADER_SRC=String.raw`
precision mediump float;
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
void main() {
  gl_FragColor = texture2D(u_Sampler, v_TexCoord);
}`;