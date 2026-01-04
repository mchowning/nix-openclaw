{ lib
, buildEnv
, clawdis-gateway
, clawdis-app
, extendedTools
}:

buildEnv {
  name = "clawdis-2.0.0-beta4";
  paths = [ clawdis-gateway clawdis-app ] ++ extendedTools;
  pathsToLink = [ "/bin" "/Applications" ];

  meta = with lib; {
    description = "Clawdbot batteries-included bundle (gateway + app + tools)";
    homepage = "https://github.com/clawdbot/clawdbot";
    license = licenses.mit;
    platforms = platforms.darwin;
  };
}
