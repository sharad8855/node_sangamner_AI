const langchain = require('langchain');
console.log(Object.keys(langchain));
try {
    const agents = require('langchain/agents');
    console.log('Agents keys:', Object.keys(agents));
} catch (e) {
    console.log('langchain/agents not found');
}
