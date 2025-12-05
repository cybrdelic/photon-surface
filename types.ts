
export enum SceneType {
  GRADIENT_PRIMITIVE = 0,
  TISSUE = 1,
  CLOUD = 2,
  WAX = 3,
  JADE = 4 // New Photorealism Test
}

export enum VisualizationMode {
  RENDER = 0,
  DIMENSION_FIELD = 1,
  SLICE = 2, // MRI Slice
  // Debug Modes
  NORMAL = 3,
  DENSITY = 4,
  TRANSMITTANCE = 5,
  STEPS = 6
}

export interface ManifoldParams {
  turbulenceStrength: number;
  transitionOffset: number; // Shifts where the "melting" starts
  waxDensity: number;
  roughness: number;
}

export interface RenderParams {
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  sceneType: SceneType;
  visMode: VisualizationMode;
  mouseX: number;
  mouseY: number;
  zoom: number;
  manifold: ManifoldParams;
}
