# Pinned OpenClaw source for nix-openclaw
{
  owner = "openclaw";
  repo = "openclaw";
  pnpmMajor = "11";
  applyPublicSurfaceHardlinksPatch = false;
  applySkipPluginAutoEnableNixModePatch = false;
  applyNixStorePluginOwnershipPatch = true;
  releaseTag = "v2026.7.1-2";
  releaseVersion = "2026.7.1-2";
  runtimePluginVersion = "2026.7.1";
  rev = "0790d9f593ad30c940ed93b5872a8cf6d6f3cf8c";
  hash = "sha256-kpiKCTjXX4l525IJDNsnI7j2IT6ZYdqvFTyRlKGgomg=";
  gatewayNpmDepsHash = "sha256-wgFsto4dpdVHl0x+H/QL/Rf6bSznmGJFd+tfirnACu8=";
}
