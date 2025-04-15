pipeline {
    agent any

    environment {
        NODE_VERSION = '20.17.0'
        PR_NUMBER = "${env.CHANGE_ID}" // PR number comes from webhook payload
        IMAGE_TAG="ghcr.io/gitroomhq/postiz-app-pr:${env.CHANGE_ID}"
    }

    stages {
        stage('Checkout Repository') {
            steps {
                checkout scm
            }
        }

        stage('Check Node.js and npm') {
            steps {
                script {
                    sh "node -v"
                    sh "npm -v"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build Project') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Build and Push Docker Image') {
            when {
                expression { return env.CHANGE_ID != null }  // Only run if it's a PR
            }
            steps {
                withCredentials([string(credentialsId: 'gh-pat', variable: 'GITHUB_PASS')]) {
                    // Docker login step
                    sh '''
                        echo "$GITHUB_PASS" | docker login ghcr.io -u "egelhaus" --password-stdin
                    '''
                    // Build Docker image
                    sh '''
                        docker build -f Dockerfile.dev -t $IMAGE_TAG .
                    '''
                    // Push Docker image to GitHub Container Registry
                    sh '''
                        docker push $IMAGE_TAG
                    '''
                }
            }
        }
    }
    post {
        success {
            echo 'Build completed successfully!'

        }
        failure {
            echo 'Build failed!'

        }
    }
}
