// Declarative Pipeline for building Node.js application and running SonarQube analysis triggered by a push event.
pipeline {
    // Defines the execution environment. Using 'agent any' to ensure an agent is available.
    agent any 

    stages {
        // Stage 2: Setup Node.js v20 and install pnpm
        stage('Setup Environment') {
            steps {
                sh '''
                    ATTEMPTS=0
                    MAX_ATTEMPTS=5
                    
                    # Function to robustly run apt commands with retries in case of lock conflict
                    install_with_retry() {
                        CMD=\$1
                        ATTEMPTS=0
                        while [ \$ATTEMPTS -lt \$MAX_ATTEMPTS ]; do
                            # Run update first, then the command
                            if sudo apt-get update && \$CMD; then
                                return 0 # Success
                            else
                                ATTEMPTS=\$((ATTEMPTS + 1))
                                if [ \$ATTEMPTS -lt \$MAX_ATTEMPTS ]; then
                                    echo "Apt lock detected or command failed. Retrying in 5 seconds (Attempt \$ATTEMPTS of \$MAX_ATTEMPTS)..."
                                    sleep 5
                                fi
                            fi
                        done
                        echo "Failed to execute apt command after \$MAX_ATTEMPTS attempts."
                        return 1 # Failure
                    }
                    
                    # 1. Install curl (required for NodeSource script)
                    install_with_retry "sudo apt-get install -y curl" || exit 1
                    
                    # 2. Install Node.js v20 (closest matching the specified version '20.17.0')
                    # This step uses curl (installed above) and needs its own apt-get execution.
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    install_with_retry "sudo apt-get install -y nodejs" || exit 1
                    
                    echo "Node.js version: \$(node -v)"
                    
                    # 3. Install pnpm globally (version 8)
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

        // Stage 4: Retrieve secrets from Vault and run SonarQube analysis
        stage('SonarQube Analysis') {
            steps {
                script {
                    // 1. Get the short 8-character commit SHA for project versioning
                    def commitShaShort = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    echo "Commit SHA (short) is: ${commitShaShort}"
                    
                    // 2. Retrieve secrets from HashiCorp Vault using the dedicated plugin binding.
                    withCredentials([
                        // Requires the Jenkins HashiCorp Vault Plugin
                        [$class: 'VaultSecretCredentialsBinding',
                         vaultSecrets: [
                             // Map key 'SONAR_TOKEN' from Vault path 'postiz/data/ci/sonar' to Jenkins environment variable 'SONAR_TOKEN'
                             [$class: 'VaultSecret', secretPath: 'postiz/data/ci/sonar', secretKey: 'SONAR_TOKEN', envVar: 'SONAR_TOKEN'],
                             // Map key 'SONAR_HOST_URL' from Vault path 'postiz/data/ci/sonar', to Jenkins environment variable 'SONAR_HOST_URL']
                             [$class: 'VaultSecret', secretPath: 'postiz/data/ci/sonar', secretKey: 'SONAR_HOST_URL', envVar: 'SONAR_HOST_URL']
                         ]]
                    ]) {
                        // 3. Execute sonar-scanner CLI
                        sh """
                            echo "Starting SonarQube Analysis for project version: ${commitShaShort}"
                            sonar-scanner \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.token=\${SONAR_TOKEN} \\
                                -Dsonar.host.url=\${SONAR_HOST_URL}
                                # Add other analysis properties here if needed (e.g., -Dsonar.projectKey=...)
                        """
                    }
                }
            }
        }
    }
}
