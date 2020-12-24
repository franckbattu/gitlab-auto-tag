import * as dotenv from 'dotenv';
import * as semver from 'semver';
import axios from 'axios';

dotenv.config();

const url = `${process.env.CI_SERVER_URL}/api/v4/projects/${process.env.CI_PROJECT_ID}`;
const privateToken = process.env.PRIVATE_ACCESS_TOKEN || "";

const lastMergeRequest = async () => {
    const request = await axios(`${url}/merge_requests?target_branch=master&state=merged`, {
        headers: {
            'private-token': privateToken
        }
    });
    const data = await request.data;
    return data[0];
}

const getLabels = (mergeRequest: Object) => {
    // @ts-ignore
    return mergeRequest.labels;
}

const getBump = (labels: string[]) => {
    if (labels.includes('major')) {
        return 'major';
    }
    if (labels.includes('minor')) {
        return 'minor';
    }
    else return 'patch';
}

const lastTag = async () => {
    const request = await axios(`${url}/repository/tags`, {
        headers: {
            'private-token': privateToken
        }
    });
    const data = await request.data;
    return data[0].name;
}

const generateNewTag = (oldTag: string, bump: semver.ReleaseType) => {
    const tag = semver.inc(oldTag, bump);
    return tag;
}

const pushTag = async (newTag: string | null, branch: string = "master") => {

    const body = {
        tag_name: `v${newTag}`,
        ref: branch,
        message: "Created by merge_request",
        release_description: `Version ${newTag}`
    }

   await axios(`${url}/repository/tags`, {
        method: 'POST',
        headers: {
            'private-token': privateToken
        },
        data: body
    });

}

const main = async () => {
    const lastMR = await lastMergeRequest();
    const labels = getLabels(lastMR);

    if (labels.length == 0) {
        return;
    }

    const bump = getBump(labels);
    const oldTag = await lastTag();
    const newTag = generateNewTag(oldTag, bump);
    await pushTag(newTag);
}


main();