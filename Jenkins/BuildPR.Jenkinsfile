// Declarative Pipeline for building Node.js application and running SonarQube analysis for a Pull Request.
pipeline {
    // Defines the execution environment. Replace 'linux-agent' with your specific agent label.
    agent any
    // Configure options, primarily to ensure full Git history is fetched for SonarQube and versioning.
    options {
        // Skip the default checkout to manage it explicitly and ensure fetch-depth: 0.
        skipDefaultCheckout()
    }
    
    // Environment variables that hold PR details (set automatically by Jenkins SCM plugins like Git/GitHub Branch Source)
    environment {
        // These variables are provided by Jenkins (e.g., in a Multibranch Pipeline setup)
        // CHANGE_ID corresponds to ${{ github.event.pull_request.number }}
        // CHANGE_BRANCH corresponds to ${{ github.event.pull_request.head.ref }}
        // CHANGE_TARGET corresponds to ${{ github.event.pull_request.base.ref }}
        PR_KEY = env.CHANGE_ID
        PR_BRANCH = env.CHANGE_BRANCH
        PR_BASE = env.CHANGE_TARGET
    }

    stages {
        // Stage 1: Checkout the code with full history (fetch-depth: 0)
        stage('Source Checkout') {
            steps {
                script {
                    // This performs a deep clone (fetch-depth: 0)
                    // NOTE: You must replace 'YOUR_GIT_CREDENTIALS_ID' with the actual Jenkins credential ID 
                    // that has access to your repository.
                    checkout([
                        $class: 'GitSCM', 
                        branches: [[name: 'HEAD']], 
                        extensions: [
                            [$class: 'WipeWorkspace'], 
                            [$class: 'CleanBeforeCheckout'], 
                            [$class: 'CloneOption', depth: 0, noTags: false, reference: '', shallow: false]
                        ], 
                        userRemoteConfigs: [
                            [url: env.GIT_URL ?: '']
                        ]
                    ])
                }
            }
        }

        // Stage 2: Setup Node.js v20 and install pnpm
        stage('Setup Environment') {
            steps {
                sh '''
                    # Install Node.js v20 (closest matching the specified version '20.17.0')
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    
                    echo "Node.js version: \$(node -v)"
                    
                    # Install pnpm globally (version 8)
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

        // Stage 4: Retrieve secrets from Vault and run SonarQube PR analysis
        stage('SonarQube Pull Request Analysis') {
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
                             [$class: 'VaultSecret', secretPath: 'postiz/data/ci/sonar', secretKey: 'SONAR_TOKEN', envVar: 'SONAR_TOKEN'],
                             [$class: 'VaultSecret', secretPath: 'postiz/data/ci/sonar', secretKey: 'SONAR_HOST_URL', envVar: 'SONAR_HOST_URL']
                         ]]
                    ]) {
                        // 3. Execute sonar-scanner CLI with Pull Request parameters
                        sh """
                            echo "Starting SonarQube Pull Request Analysis for PR #${PR_KEY}"
                            sonar-scanner \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.token=\${SONAR_TOKEN} \\
                                -Dsonar.host.url=\${SONAR_HOST_URL} \\
                                -Dsonar.pullrequest.key=${PR_KEY} \\
                                -Dsonar.pullrequest.branch=${PR_BRANCH} \\
                                -Dsonar.pullrequest.base=${PR_BASE}
                                # Add other analysis properties here if needed (e.g., -Dsonar.projectKey=...)
                        """
                    }
                }
            }
        }
    }
}
