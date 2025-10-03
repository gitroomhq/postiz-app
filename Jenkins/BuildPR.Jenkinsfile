// Declarative Pipeline for building Node.js application and running SonarQube analysis for a Pull Request.
pipeline {
    // Defines the execution environment. Using 'agent any' to ensure an agent is available.
    agent any

    // Environment variables that hold PR details, provided by Jenkins Multibranch setup.
    environment {
        // FIX: Environment variables must be quoted or wrapped in a function call.
        // We quote the 'env.CHANGE_ID' reference to fix the compilation error.
        PR_KEY = "${env.CHANGE_ID}"
        PR_BRANCH = "${env.CHANGE_BRANCH}"
        PR_BASE = "${env.CHANGE_TARGET}"
    }

    stages {
        // Stage 1: Checkout the code (Relies on the initial SCM checkout done by Jenkins)
        stage('Source Checkout') {
            steps {
                echo "Workspace already populated by the initial SCM checkout. Proceeding."
            }
        }

        // Stage 2: Setup Node.js v20, install pnpm, and install required tools (curl, unzip)
        stage('Setup Environment and Tools') {
            steps {
                sh '''
                    echo "Ensuring required utilities and Node.js are installed..."
                    sudo apt-get update
                    sudo apt-get install -y curl unzip nodejs
                    
                    # 1. Install Node.js v20 (closest matching the specified version '20.17.0')
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    echo "Node.js version: \$(node -v)"
                    
                    # 2. Install pnpm globally (version 8)
                    npm install -g pnpm@8
                    echo "pnpm version: \$(pnpm -v)"
                '''
            }
        }

        // Stage 3: Install dependencies and build the application
        stage('Install and Build') {
            steps {
                sh 'pnpm install'
                sh 'pnpm run build'
            }
        }

        // Stage 4: Run SonarQube PR analysis: Install scanner locally, get version, and execute.
        stage('SonarQube Pull Request Analysis') {
            steps {
                script {
                    // 1. Get the short 8-character commit SHA for project versioning
                    def commitShaShort = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    echo "Commit SHA (short) is: ${commitShaShort}"
                    
                    // --- 2. MANUALLY INSTALL THE SONAR SCANNER CLI LOCALLY ---
                    sh """
                        echo "Manually downloading and installing Sonar Scanner CLI..."
                        curl -sS -o sonar-scanner.zip \
                        "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.7.0.2747.zip"
                        unzip -o -q sonar-scanner.zip -d .
                    """

                    // 3. Find the extracted directory name and capture the full absolute executable path.
                    def scannerBinPath = sh(
                        returnStdout: true,
                        script: '''
                            SCANNER_DIR=$(find . -maxdepth 1 -type d -name "sonar-scanner*" | head -n 1)
                            # Get the full absolute path to the executable file
                            echo \$(pwd)/\${SCANNER_DIR}/bin/sonar-scanner
                        '''
                    ).trim()
                    
                    echo "Scanner executable path captured: ${scannerBinPath}"
                    
                    // 4. Use withSonarQubeEnv to set up the secure variables (HOST and TOKEN)
                    withSonarQubeEnv(installationName: 'SonarQube-Server') {
                        // 5. Execute the scanner using the Groovy variable directly with PR parameters.
                        sh """
                            echo "Starting SonarQube Pull Request Analysis for PR #${PR_KEY}"
                            
                            '${scannerBinPath}' \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.sources=. \\
                                -Dsonar.pullrequest.key=${PR_KEY} \\
                                -Dsonar.pullrequest.branch=${PR_BRANCH} \\
                                -Dsonar.pullrequest.base=${PR_BASE}
                                
                            # SONAR_HOST_URL and SONAR_TOKEN are automatically passed as environment variables
                            # by the withSonarQubeEnv block.
                        """
                    }
                }
            }
        }
    }
}
