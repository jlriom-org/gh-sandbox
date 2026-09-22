import { debug, warning, getInput, setOutput, exportVariable, startGroup, endGroup, setFailed } from "@actions/core";
import { context } from "@actions/github";


try {
    debug("Debug Message");
    warning("Warning message");

    const name = getInput('who_to_greet');

    console.log(`Hello $ {name}`)

    const time = new Date();

    setOutput("time", time.toTimeString());

    exportVariable("HELLO_TIME", time.toTimeString());

    startGroup("Logging github context");

    console.log(JSON.stringify(context, null, 2));

    endGroup();

} catch (error) {
    setFailed(error.message);
}

