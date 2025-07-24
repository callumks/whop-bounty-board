#!/usr/bin/env node

/**
 * Whop Integration Setup Script
 *
 * This script helps you configure and test your Whop integration for the challenge funding system.
 * Run with: node scripts/setup-whop-integration.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const https = require("https");

class WhopSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.config = {};
  }

  async run() {
    console.log("\n🚀 Whop Integration Setup for Challenge Funding System\n");

    try {
      await this.checkCurrentSetup();
      await this.gatherConfiguration();
      await this.validateConfiguration();
      await this.writeEnvFile();
      await this.testConnection();
      await this.setupWebhooks();

      console.log("\n✅ Setup complete! Your Whop integration is ready.");
      console.log("\n📚 Next steps:");
      console.log("1. Start your development server: npm run dev");
      console.log("2. Test challenge creation and funding");
      console.log("3. Check webhook delivery in Whop dashboard");
      console.log(
        "4. Review WHOP_INTEGRATION_GUIDE.md for production deployment"
      );
    } catch (error) {
      console.error("\n❌ Setup failed:", error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async checkCurrentSetup() {
    console.log("🔍 Checking current setup...");

    // Check if .env.local exists
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      console.log("   ✓ Found existing .env.local file");

      // Parse existing env variables
      const envContent = fs.readFileSync(envPath, "utf8");
      const envVars = this.parseEnvFile(envContent);

      if (envVars.WHOP_API_KEY) {
        console.log("   ✓ Found existing Whop API key");
        this.config.hasExistingConfig = true;
        this.config.existingVars = envVars;
      }
    } else {
      console.log("   ⚠️  No .env.local file found - will create one");
    }

    // Check package.json for Whop SDK
    const packagePath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      if (
        packageJson.dependencies &&
        packageJson.dependencies["@whop-sdk/core"]
      ) {
        console.log("   ✓ Whop SDK is installed");
      } else {
        console.log("   ⚠️  Whop SDK not found in dependencies");
        console.log("   Run: npm install @whop-sdk/core");
      }
    }
  }

  async gatherConfiguration() {
    console.log("\n📝 Configuration Setup\n");

    if (this.config.hasExistingConfig) {
      const useExisting = await this.askQuestion(
        "Found existing Whop configuration. Use existing values? (y/n): "
      );
      if (useExisting.toLowerCase() === "y") {
        this.config = { ...this.config, ...this.config.existingVars };
        return;
      }
    }

    console.log(
      "Please provide your Whop app credentials from https://whop.com/apps\n"
    );

    this.config.WHOP_API_KEY = await this.askQuestion("Whop API Key: ");
    this.config.WHOP_WEBHOOK_SECRET = await this.askQuestion(
      "Whop Webhook Secret: "
    );
    this.config.NEXT_PUBLIC_WHOP_APP_ID = await this.askQuestion(
      "Whop App ID: "
    );
    this.config.NEXT_PUBLIC_WHOP_COMPANY_ID = await this.askQuestion(
      "Whop Company ID: "
    );

    const environment = await this.askQuestion(
      "Environment (development/production) [development]: "
    );
    this.config.WHOP_ENVIRONMENT = environment || "development";

    const appUrl = await this.askQuestion("App URL [http://localhost:3000]: ");
    this.config.NEXT_PUBLIC_APP_URL = appUrl || "http://localhost:3000";
    this.config.NEXTAUTH_URL = this.config.NEXT_PUBLIC_APP_URL;

    if (!this.config.NEXTAUTH_SECRET) {
      this.config.NEXTAUTH_SECRET = this.generateRandomSecret();
      console.log("   ✓ Generated NEXTAUTH_SECRET");
    }
  }

  async validateConfiguration() {
    console.log("\n🔍 Validating configuration...");

    const requiredVars = [
      "WHOP_API_KEY",
      "WHOP_WEBHOOK_SECRET",
      "NEXT_PUBLIC_WHOP_APP_ID",
      "NEXT_PUBLIC_WHOP_COMPANY_ID",
    ];

    for (const varName of requiredVars) {
      if (!this.config[varName]) {
        throw new Error(`Missing required configuration: ${varName}`);
      }
      console.log(`   ✓ ${varName} is set`);
    }

    // Validate API key format
    if (!this.config.WHOP_API_KEY.startsWith("whop_")) {
      console.log('   ⚠️  API key format warning - should start with "whop_"');
    }

    // Validate App ID format
    if (!this.config.NEXT_PUBLIC_WHOP_APP_ID.startsWith("app_")) {
      console.log('   ⚠️  App ID format warning - should start with "app_"');
    }

    // Validate Company ID format
    if (!this.config.NEXT_PUBLIC_WHOP_COMPANY_ID.startsWith("comp_")) {
      console.log(
        '   ⚠️  Company ID format warning - should start with "comp_"'
      );
    }
  }

  async testConnection() {
    console.log("\n🌐 Testing Whop API connection...");

    try {
      const response = await this.makeWhopAPIRequest(
        "/app/companies/" + this.config.NEXT_PUBLIC_WHOP_COMPANY_ID
      );

      if (response.success) {
        console.log("   ✅ API connection successful");
        console.log(
          `   ✓ Connected to company: ${response.data.name || "Unknown"}`
        );
      } else {
        console.log("   ❌ API connection failed:", response.error);
        console.log("   Please check your API key and company ID");
      }
    } catch (error) {
      console.log("   ⚠️  Connection test failed:", error.message);
      console.log("   This may be normal if using development credentials");
    }
  }

  async setupWebhooks() {
    console.log("\n🔗 Webhook Configuration\n");

    const webhookUrl = `${this.config.NEXT_PUBLIC_APP_URL}/api/webhooks/whop`;

    console.log("Configure webhooks in your Whop app dashboard:");
    console.log("1. Go to https://whop.com/apps");
    console.log("2. Select your app → Settings → Webhooks");
    console.log("3. Add webhook endpoint:");
    console.log(`   URL: ${webhookUrl}`);
    console.log(
      "   Events: payment.succeeded, payment.failed, payment.canceled"
    );
    console.log(`   Secret: ${this.config.WHOP_WEBHOOK_SECRET}`);

    if (this.config.WHOP_ENVIRONMENT === "development") {
      console.log("\n💡 For local development:");
      console.log("1. Install ngrok: npm install -g ngrok");
      console.log("2. Expose your local server: ngrok http 3000");
      console.log("3. Update webhook URL to ngrok URL in Whop dashboard");
      console.log("4. Test webhooks using Whop's webhook testing tool");
    }

    const configured = await this.askQuestion(
      "\nHave you configured the webhooks? (y/n): "
    );
    if (configured.toLowerCase() !== "y") {
      console.log("⚠️  Remember to configure webhooks before testing payments");
    }
  }

  async writeEnvFile() {
    console.log("\n📄 Writing configuration to .env.local...");

    const envPath = path.join(process.cwd(), ".env.local");

    // Preserve existing non-Whop environment variables
    let existingEnv = {};
    if (fs.existsSync(envPath)) {
      const existingContent = fs.readFileSync(envPath, "utf8");
      existingEnv = this.parseEnvFile(existingContent);
    }

    // Merge configurations
    const finalConfig = {
      ...existingEnv,
      ...this.config,
      // Ensure database URL exists
      DATABASE_URL:
        this.config.DATABASE_URL ||
        existingEnv.DATABASE_URL ||
        "postgresql://username:password@localhost:5432/challengehub?schema=public",
    };

    // Remove internal config properties
    delete finalConfig.hasExistingConfig;
    delete finalConfig.existingVars;

    // Generate env file content
    const envContent = Object.entries(finalConfig)
      .map(([key, value]) => `${key}="${value}"`)
      .join("\n");

    fs.writeFileSync(envPath, envContent);
    console.log("   ✅ Configuration saved to .env.local");
  }

  parseEnvFile(content) {
    const env = {};
    content.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key] = value.replace(/^"(.*)"$/, "$1"); // Remove quotes
      }
    });
    return env;
  }

  generateRandomSecret() {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  makeWhopAPIRequest(endpoint) {
    return new Promise((resolve) => {
      const options = {
        hostname: "api.whop.com",
        port: 443,
        path: "/api/v5" + endpoint,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.WHOP_API_KEY}`,
          "Content-Type": "application/json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ success: res.statusCode === 200, data: jsonData });
          } catch (error) {
            resolve({ success: false, error: "Invalid response format" });
          }
        });
      });

      req.on("error", (error) => {
        resolve({ success: false, error: error.message });
      });

      req.end();
    });
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new WhopSetup();
  setup.run().catch(console.error);
}

module.exports = WhopSetup;
