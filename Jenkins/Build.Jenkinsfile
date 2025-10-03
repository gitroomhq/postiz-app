// Declarative Pipeline for building Node.js application and running SonarQube analysis triggered by a push event.
pipeline {
    // Defines the execution environment. Using 'agent any' to ensure an agent is available.
    agent any 

    stages {
        // Stage 1: Checkout the code (Relies on the initial SCM checkout done by Jenkins)
        stage('Source Checkout') {
            steps {
                echo "Workspace already populated by the initial SCM checkout. Proceeding."
                // No explicit checkout needed, as the initial checkout is successful.
            }
        }

        // Stage 2: Setup Node.js v20 and install pnpm
        stage('Setup Environment') {
            steps {
                // Simplified environment setup based on previous successful execution.
                sh '''
                    # 1. Install Node.js v20 (closest matching the specified version '20.17.0')
                    # We assume 'curl' is available and installation proceeds without lock conflicts now.
                    echo "Setting up Node.js v20..."
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

        // Stage 4: Run SonarQube analysis using the Jenkins plugin's environment.
        stage('SonarQube Analysis') {
            steps {
                script {
                    // 1. Get the short 8-character commit SHA for project versioning
                    def commitShaShort = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    echo "Commit SHA (short) is: ${commitShaShort}"
                    
                    // 2. Use withSonarQubeEnv to set up the environment and PATH for sonar-scanner.
                    // IMPORTANT: Replace 'YourSonarServerName' with the name you configured 
                    // for your SonarQube server instance in Jenkins (Manage Jenkins -> Configure System).
                    withSonarQubeEnv(installationName: 'YourSonarServerName') {
                        // 3. Execute sonar-scanner CLI
                        sh """
                            echo "Starting SonarQube Analysis for project version: ${commitShaShort}"
                            sonar-scanner \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.sources=. \\
                                -Dsonar.host.url=\${SONAR_HOST_URL} \\
                                -Dsonar.token=\${SONAR_TOKEN}
                                # Add -Dsonar.projectKey=YourKeyHere if not defined in sonar-project.properties
                        """
                    }
                }
            }
        }
    }
}
