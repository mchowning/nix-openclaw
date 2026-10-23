{
  lib,
  stdenvNoCC,
  fetchzip,
}:

stdenvNoCC.mkDerivation {
  pname = "openclaw-app";
  version = "2026.10.6";

  src = fetchzip {
    url = "https://github.com/openclaw/openclaw/releases/download/v2026.10.6/OpenClaw-2026.10.6.zip";
    hash = "sha256-yRtu0Jd1ZbPlZ05SDEVd3b5CEhYYIB/3myWL7+iKY9c=";
    stripRoot = false;
  };

  dontUnpack = true;
  # Shebang fixups would invalidate the signed upstream app bundle.
  dontFixup = true;

  installPhase = "${../scripts/openclaw-app-install.sh}";

  meta = with lib; {
    description = "OpenClaw macOS app bundle";
    homepage = "https://github.com/openclaw/openclaw";
    license = licenses.mit;
    platforms = platforms.darwin;
  };
}
