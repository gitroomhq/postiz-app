pipeline {
    agent any

    environment {
        NODE_VERSION = '20.17.0'
        PR_NUMBER = "${env.CHANGE_ID}" // PR number comes from webhook payload
        IMAGE_TAG = "xtremeverveacr.azurecr.io/postiz-app-pr:${env.CHANGE_ID}"
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

        stage('Build and Push Docker Image to ACR') {
            when {
                expression { return env.CHANGE_ID != null }  // Only run if it's a PR
            }
            steps {
                withCredentials([
                    string(credentialsId: 'acr-username', variable: 'ACR_USERNAME'),
                    string(credentialsId: 'acr-password', variable: 'ACR_PASSWORD')
                ]) {
                    sh '''
                        echo "$ACR_PASSWORD" | docker login xtremeverveacr.azurecr.io -u "$ACR_USERNAME" --password-stdin
                        docker build -f Dockerfile.dev -t $IMAGE_TAG .
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
