  if [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
    docker login -u "$DOCKER_USERNAME" -p "$DOCKER_PASSWORD";

    PACKAGE_VERSION=$(node -p -e "require('./package.json').version")
    echo "Pusing to Docker-hub version $PACKAGE_VERSION, generated from branch $TRAVIS_BRANCH";
    if [[ $PACKAGE_VERSION = *"-SNAPSHOT"* ]]; then
      echo "Pusing image release...";
      docker tag dx-services gnosispm/dx-services:release;
      docker push gnosispm/dx-services:release;
    elif [ "$TRAVIS_BRANCH" == "master" ]; then
      echo "Pusing image staging...";
      docker tag dx-services gnosispm/dx-services:staging;
      docker push gnosispm/dx-services:staging;
    elif [ "$TRAVIS_BRANCH" == "develop" ]; then
      echo "Pusing image develop...";
      docker tag dx-services gnosispm/dx-services:develop;
      docker push gnosispm/dx-services:develop;
    elif [[ $TRAVIS_TAG = $TRAVIS_BRANCH ]]; then
      echo "Pusing image tag $TRAVIS_TAG...";
      docker tag dx-services gnosispm/dx-services:$TRAVIS_TAG;
      docker push gnosispm/dx-services:$TRAVIS_TAG;
    fi
    echo "The image has been pushed";
  else
    echo "There's no need to push the image to Docker-hub";
  fi