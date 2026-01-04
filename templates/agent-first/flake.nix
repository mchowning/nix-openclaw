{
  description = "Clawdbot local";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager.url = "github:nix-community/home-manager";
    home-manager.inputs.nixpkgs.follows = "nixpkgs";
    nix-clawdbot.url = "github:clawdbot/nix-clawdbot";
  };

  outputs = { self, nixpkgs, home-manager, nix-clawdbot }:
    let
      # REPLACE: aarch64-darwin (Apple Silicon) or x86_64-darwin (Intel)
      system = "<system>";
      pkgs = import nixpkgs { inherit system; overlays = [ nix-clawdbot.overlays.default ]; };
    in {
      # REPLACE: <user> with your macOS username (run `whoami`)
      homeConfigurations."<user>" = home-manager.lib.homeManagerConfiguration {
        inherit pkgs;
        modules = [
          nix-clawdbot.homeManagerModules.clawdis
          {
            # Required for Home Manager standalone
            home.username = "<user>";
            home.homeDirectory = "/Users/<user>";
            home.stateVersion = "24.11";
            programs.home-manager.enable = true;

            programs.clawdis = {
              # REPLACE: path to your managed documents directory
              documents = ./documents;
              instances.default = {
                enable = true;
                providers.telegram = {
                  enable = true;
                  # REPLACE: path to your bot token file
                  botTokenFile = "<tokenPath>";
                  # REPLACE: your Telegram user ID (get from @userinfobot)
                  allowFrom = [ <allowFrom> ];
                  # Group defaults (required in Nix mode):
                  groups = {
                    "*" = { requireMention = true; };
                  };
                };
                providers.anthropic = {
                  # REPLACE: path to your Anthropic API key file
                  apiKeyFile = "<anthropicKeyPath>";
                };

                plugins = [
                  # Example plugin without config:
                  { source = "github:acme/hello-world"; }
                ];
              };
            };
          }
        ];
      };
    };
}
