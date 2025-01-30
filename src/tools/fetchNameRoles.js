/*
* The following scripts reads a CSV file with user ids and fetches the usernames and roles from an API.
* It was used for inserting data to warpy_user_handler_roles.
* */

const fs = require('fs');
const readline = require('readline');

const FILE_PATH = './users_100k.csv'; // users
const NAMES_URL = 'https://api-warpy.warp.cc/v1/usernames?ids='; // Replace with your API endpoint
const ROLES_URL = 'https://api-warpy.warp.cc/v1/usersRoles?'; // Replace with your API endpoint
const BATCH_SIZE = 50;



async function processFile() {
    const stream = fs.createWriteStream("./userNamesRoles100k.sql", {flags:'a'});
    console.log(`Start`, new Date().toISOString());

    stream.write(`INSERT INTO warpy_user_handler_roles (user_id, username, roles) VALUES \n`);

    let i = 0;


    const fileStream = fs.createReadStream(FILE_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let batch = [];

    for await (const line of rl) {
        batch.push(line);

        if (batch.length === BATCH_SIZE) {
            console.log(`Sending batch:`, i++, new Date().toISOString());
            await saveBatch(batch, stream);
            batch = [];
            await delay(250);
        }
    }

    // Send remaining lines if any
    if (batch.length > 0) {
        console.log(`Sending batch:`, i++, new Date().toISOString());
        await saveBatch(batch, stream);
    }

    console.log('File processing complete.', new Date().toISOString());
    stream.end();
}

async function saveBatch(batch, stream) {
    const results = await fetchHandlers(batch);
    console.log(`handlers`, results)
    const namesWithRoles = await fetchRoles(results);
    console.log(`namesWithRoles`, namesWithRoles)
    Object.values(namesWithRoles).forEach( function (item,index) {
        stream.write(` ('${item.id}', '${item.handler}', '{${item.roles}}'),\n`);
    });
}

async function fetchHandlers(batch) {
    let response = {
        ok: false
    };
    try {
        while (!response.ok) {
            response = await fetch(NAMES_URL + batch.join(','), {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                await delay(5000);
                console.error(`Failed to send batch: ${response.statusText}`);
            }
        }


        const result = await response.json();
        console.log('Response:', result.length);
        return result.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchRoles(batch) {
    let response = {
        ok: false
    };
    console.log(`ids`, Object.keys(batch))
    try {
        while (!response.ok) {
            response = await fetch(ROLES_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: Object.keys(batch)
                })
            });
            if (!response.ok) {
                await delay(5000);
                console.error(`Failed to send batch: ${response.statusText}`);
            }
        }


        const id_to_roles = (await response.json()).id_to_roles;
        console.log('id_to_roles:', id_to_roles);
        Object.entries(id_to_roles).forEach(([key, value]) => {
            batch[key].roles = value;
        });
        return batch;
    } catch (error) {
        console.error('Error:', error);
    }
}


// Run the function
processFile();



const delay = millis => new Promise((resolve, reject) => {
    setTimeout(_ => resolve(), millis)
});


