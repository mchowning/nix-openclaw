{
  lib,
  stdenvNoCC,
  fetchzip,
}:

stdenvNoCC.mkDerivation {
  pname = "openclaw-app";
  version = "2026.10.7";

  src = fetchzip {
    url = "https://github.com/openclaw/openclaw/releases/download/v2026.10.7/OpenClaw-2026.10.7.zip";
    hash = "sha256-HlN9Ca9YgdjUtwCJ8MW85kgUllQSBtfa9H/WVIi5NmQ=";
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
