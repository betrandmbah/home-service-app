pipeline {
    agent any

    environment {
        AWS_DEFAULT_REGION = 'us-east-1'
        S3_BUCKET = 'project-bk-home-service'
        BACKEND_HOST = '10.0.1.221'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/betrandmbah/home-service-app.git'
            }
        }

        stage('Deploy Backend') {
            steps {
                sshagent(credentials: ['backend-ec2-key']) {
                    sh '''
                            ssh -o StrictHostKeyChecking=no \
                                -o UserKnownHostsFile=/dev/null \
                                -o ConnectTimeout=20 \
                                -o ServerAliveInterval=30 \
                                -o ServerAliveCountMax=3 \ 
                                ec2-user@$BACKEND_HOST "
                                    set -e
                                    cd /home/ec2-user/home-service-app!!/backend
                                    chmod +x deploy.sh &&
                                    ./deploy.sh
                                    exit
                               "
                    '''
                }
            }
        }

        stage('Deploy Frontend to S3') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-creds'
                ]]) {
                    sh '''        aws s3 sync frontend/ s3://$S3_BUCKET --delete
                    '''
                
                }
            }
        }
    }
}