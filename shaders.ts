
export const SCREEN_SHADER = `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mouse: vec2<f32>,
  cameraZoom: f32,
  sceneType: u32,
  visMode: u32,
  // Manifold Params
  turbulence: f32,
  offset: f32,
  density: f32,
  roughness: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn main_vertex(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );
  var output : VertexOutput;
  output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  output.uv = pos[VertexIndex] * 0.5 + 0.5;
  return output;
}

// --- CONSTANTS ---
const PI = 3.14159265359;
const MAX_STEPS = 256; 
const VOL_STEPS = 128; 
const MAX_DIST = 35.0;

// --- NOISE ---
fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453); }
fn noise(x: vec3<f32>) -> f32 {
    let p = floor(x);
    let f = fract(x);
    let f2 = f*f*(3.0-2.0*f);
    let n = p.x + p.y*57.0 + 113.0*p.z;
    return mix(mix(mix(hash(n+0.0), hash(n+1.0), f2.x),
                   mix(hash(n+57.0), hash(n+58.0), f2.x), f2.y),
               mix(mix(hash(n+113.0), hash(n+114.0), f2.x),
                   mix(hash(n+170.0), hash(n+171.0), f2.x), f2.y), f2.z);
}

// --- SPECTRAL FBM (THE FRACTIONAL MATH) ---
fn spectral_fbm(p: vec3<f32>, dim: f32) -> f32 {
    let H = clamp(3.0 - dim, 0.0, 1.0); // Roughness
    let G = exp2(-H); // Gain decay
    var f = 1.0;
    var a = 0.5; 
    var t = 0.0;
    for(var i=0; i<4; i++) {
        t += a * noise(p * f);
        f *= 2.0;
        a *= G; 
    }
    return t;
}

// --- FBM helper ---
fn fbm(p: vec3<f32>) -> f32 {
    var f = 0.0; var x = p; var a = 0.5;
    for(var i=0; i<3; i++) {
        f += a * noise(x); x = x*2.02; a *= 0.5; 
    }
    return f;
}

// --- GEOMETRY: TORUS KNOT ---
fn sdTorusKnot(p: vec3<f32>) -> f32 {
    let scale = 1.2;
    let p_sc = p / scale;
    let r = length(p_sc.xz);
    let a = atan2(p_sc.z, p_sc.x);
    let q = vec2<f32>(length(vec2<f32>(r - 2.0, p_sc.y)) - 0.5, 0.0);
    let k = 3.0 * a + u.time * 0.1;
    let c = cos(k); let s = sin(k);
    let q_rot = mat2x2<f32>(c, -s, s, c) * vec2<f32>(r - 2.0, p_sc.y);
    let d = length(vec2<f32>(q_rot.x, q_rot.y)) - 0.6;
    return d * scale * 0.5; 
}

// --- MAP FUNCTION ---
fn map(p: vec3<f32>) -> vec3<f32> {
    // 1. BASE GEOMETRY
    var d = sdTorusKnot(p);
    
    // 2. DIMENSION FIELD
    let vein_noise = fbm(p * 1.5 + u.offset);
    let dim = mix(2.0, 2.9, smoothstep(0.4, 0.65, vein_noise));
    
    // 3. FRACTIONAL DISPLACEMENT
    if (d < 0.2) {
        let displacement = spectral_fbm(p * 8.0, dim);
        let magnitude = smoothstep(2.1, 2.9, dim) * 0.08 * u.turbulence;
        d -= displacement * magnitude;
    }
    
    // 4. DENSITY
    let base_density = smoothstep(0.1, -0.3, d);
    
    return vec3<f32>(d, dim, base_density);
}

fn calcNormal(p: vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.002, 0.0);
    return normalize(vec3<f32>(
        map(p + e.xyy).x - map(p - e.xyy).x,
        map(p + e.yxy).x - map(p - e.yxy).x,
        map(p + e.yyx).x - map(p - e.yyx).x
    ));
}

// --- LIGHTING ---
fn aces(x: vec3<f32>) -> vec3<f32> {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn heatmap(v: f32) -> vec3<f32> {
    let t = clamp(v, 0.0, 1.0);
    if (t < 0.5) { return mix(vec3<f32>(0.0, 1.0, 1.0), vec3<f32>(1.0, 0.0, 1.0), t * 2.0); }
    return mix(vec3<f32>(1.0, 0.0, 1.0), vec3<f32>(1.0, 1.0, 0.0), (t - 0.5) * 2.0);
}

fn stepHeatmap(steps: f32) -> vec3<f32> {
    let t = clamp(steps / f32(MAX_STEPS), 0.0, 1.0);
    return mix(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(1.0, 0.0, 0.0), t);
}

fn hgPhase(g: f32, cos_theta: f32) -> f32 {
    let gg = g * g;
    return (1.0 - gg) / (4.0 * PI * pow(1.0 + gg - 2.0 * g * cos_theta, 1.5));
}

// --- MAIN ---
@fragment
fn main_fragment(@location(0) uv : vec2<f32>) -> @location(0) vec4<f32> {
    let res = u.resolution;
    let aspect = res.x / res.y;
    let p_uv = (uv * 2.0 - 1.0) * vec2<f32>(aspect, 1.0);

    let rotX = (u.mouse.y - 0.5) * 2.5;
    let rotY = (u.mouse.x - 0.5) * 5.0;
    let zoom = 5.0 + u.cameraZoom * 2.0;
    let ro = vec3<f32>(zoom * sin(rotY) * cos(rotX), zoom * sin(rotX), zoom * cos(rotY) * cos(rotX));
    let ta = vec3<f32>(0.0, 0.0, 0.0);
    
    let ww = normalize(ta - ro);
    let uu = normalize(cross(ww, vec3<f32>(0.0, 1.0, 0.0)));
    let vv = normalize(cross(uu, ww));
    let rd = normalize(p_uv.x * uu + p_uv.y * vv + 2.5 * ww); 

    // Reduced light intensity to prevent blowout
    let lightPos = vec3<f32>(2.0, 4.0, -10.0); 
    let lightColor = vec3<f32>(4.0); 

    // SLICE MODE
    if (u.visMode == 2u) {
        let sliceZ = sin(u.time * 0.2) * 1.5;
        let t_plane = (sliceZ - ro.z) / (rd.z + 0.0001);
        if (t_plane > 0.0) {
            let p = ro + rd * t_plane;
            if (length(p.xy) < 3.5) {
                 let data = map(p);
                 if (data.x < 0.0) {
                     let val = data.y;
                     let col = mix(vec3<f32>(0.0, 0.5, 0.2), vec3<f32>(0.8, 0.9, 0.8), smoothstep(2.0, 2.8, val));
                     return vec4<f32>(col * 2.0, 1.0);
                 }
                 if ((abs(fract(p.x)-0.5)<0.02) || (abs(fract(p.y)-0.5)<0.02)) { return vec4<f32>(0.1, 0.1, 0.1, 1.0); }
            }
        }
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }

    var col = vec3<f32>(0.02);
    var transmittance = vec3<f32>(1.0);
    var t = 0.0;
    var steps = 0;

    var hit_obj = false;
    var hit_dim = 0.0;
    var hit_p = vec3<f32>(0.0);

    for(var i=0; i<MAX_STEPS; i++) {
        steps = i;
        let p = ro + rd * t;
        let data = map(p);
        if (data.x < 0.002) {
            hit_obj = true;
            hit_dim = data.y;
            hit_p = p;
            break;
        }
        t += max(data.x * 0.5, 0.01); 
        if (t > MAX_DIST) { break; }
    }

    if (u.visMode == 1u) { if (hit_obj) { return vec4<f32>(heatmap(hit_dim - 2.0), 1.0); } return vec4<f32>(0.0, 0.0, 0.0, 1.0); }
    if (u.visMode == 6u) { return vec4<f32>(stepHeatmap(f32(steps)), 1.0); }

    if (hit_obj) {
        var t_vol = 0.05;
        let p_enter = hit_p;
        
        let n = calcNormal(p_enter);
        let v = -rd;
        let f0 = vec3<f32>(0.05); 
        let fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        
        let l_dir = normalize(lightPos - p_enter);
        let h = normalize(l_dir + v);
        
        // SURFACE SPECULAR
        let dim_factor = smoothstep(2.0, 2.9, hit_dim);
        let surface_roughness = mix(0.1, 0.8, dim_factor);
        let spec_power = mix(32.0, 2.0, dim_factor);
        let spec = pow(max(dot(n, h), 0.0), spec_power); 
        // Reduced specular contribution on rough parts
        col += vec3<f32>(spec) * lightColor * mix(0.3, 0.02, dim_factor);
        
        transmittance *= (1.0 - fresnel);

        // --- VOLUMETRIC PASS ---
        if (transmittance.x > 0.01) {
            let dt = 0.08; 
            
            for(var k=0; k<VOL_STEPS; k++) {
                let p_vol = p_enter + rd * t_vol;
                let data = map(p_vol);
                if (data.x > 0.5) { break; }
                
                let local_dim = data.y;
                let local_den = data.z;
                
                let density = local_den * u.density * 2.5; 
                
                if (density > 0.001) {
                     let l_dir_vol = normalize(lightPos - p_vol);
                     
                     // Color: Jade Green vs Rock Grey
                     let color_jade = vec3<f32>(0.1, 0.9, 0.5); 
                     // Darker rock color to avoid whiteout
                     let color_rock = vec3<f32>(0.4, 0.35, 0.3); 
                     
                     let scatter_albedo = mix(color_jade, color_rock, smoothstep(2.0, 2.8, local_dim));
                     let sigma_s = scatter_albedo * density;
                     
                     // Absorption
                     let abs_jade = vec3<f32>(0.6, 0.005, 0.8); 
                     let abs_rock = vec3<f32>(2.0); 
                     
                     let coeff_a = mix(abs_jade, abs_rock, smoothstep(2.0, 2.8, local_dim));
                     let sigma_a = coeff_a * density;
                     
                     let sigma_t = sigma_s + sigma_a;
                     let trans_step = exp(-sigma_t * dt);
                     
                     // Soft shadows
                     let shadow_d = map(p_vol + l_dir_vol * 0.4).x;
                     let shadow = smoothstep(-0.2, 0.4, shadow_d);
                     
                     // Phase
                     let g = mix(0.9, 0.0, smoothstep(2.0, 2.8, local_dim));
                     let phase = hgPhase(g, dot(rd, l_dir_vol));
                     
                     let incoming = lightColor * shadow * phase;
                     let S = incoming * sigma_s;
                     
                     col += transmittance * S * dt;
                     transmittance *= trans_step;
                }
                
                if (length(transmittance) < 0.01) { break; }
                t_vol += dt;
            }
        }
    }

    // Exposure compensation
    col = aces(col * 0.8);
    col = pow(col, vec3<f32>(1.0/2.2));
    
    return vec4<f32>(col, 1.0);
}
`