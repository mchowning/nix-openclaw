{
  lib,
  stdenvNoCC,
  fetchzip,
}:

stdenvNoCC.mkDerivation {
  pname = "openclaw-app";
  version = "2026.9.9";

  src = fetchzip {
    url = "https://github.com/openclaw/openclaw/releases/download/v2026.9.9/OpenClaw-2026.9.9.zip";
    hash = "sha256-EFEITbXHewYsvi+SKpcJIQ8pOOJ7s8oniyODCHwTdCA=";
    stripRoot = false;
  };

  dontUnpack = true;

  installPhase = "${../scripts/openclaw-app-install.sh}";

  meta = with lib; {
    description = "OpenClaw macOS app bundle";
    homepage = "https://github.com/openclaw/openclaw";
    license = licenses.mit;
    platforms = platforms.darwin;
  };
}
