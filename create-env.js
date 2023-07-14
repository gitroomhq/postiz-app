const fs = require('fs');
const readline = require('readline');

// Define the root directory of your Nx project
const rootDirectory = 'apps';

// Get a list of all apps in the project
const apps = ['backend', 'consumers', 'frontend', 'websockets']; // Replace with your actual app names

// Function to prompt the user for input
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
      rl.close();
    });
  });
}

// Function to create the .env file for an app
async function createEnvFile(appName) {
  const exampleEnvPath = `${rootDirectory}/${appName}/.env.example`;
  const envPath = `${rootDirectory}/${appName}/.env`;

  if (!fs.existsSync(exampleEnvPath)) {
    console.log(`.env.example does not exist for ${appName}. Skipping...`);
    return;
  }

  const exampleEnv = fs.readFileSync(exampleEnvPath, 'utf-8');
  const envParams = exampleEnv.split('\n').filter((line) => line.trim() !== '');

  const envContent = [];

  for (const param of envParams) {
    const [key, defaultValue] = param.split('=');
    const value = await promptUser(`[${appName.toUpperCase()}] Enter a value for ${key} (default: ${defaultValue}): `);

    envContent.push(`${key}=${value || defaultValue}`);
  }

  fs.writeFileSync(envPath, envContent.join('\n'), 'utf-8');

  console.log(`Created .env file for ${appName}`);
}

// Iterate over each app and create the .env file
async function createEnvFilesForApps() {
  for (const appName of apps) {
    await createEnvFile(appName);
  }
}

// Run the script
createEnvFilesForApps().catch((error) => {
  console.error('An error occurred:', error);
});
