import * as core from '@actions/core'
import {
  CloudFormationClient,
  DeleteStackCommand
} from '@aws-sdk/client-cloudformation'

async function run(): Promise<void> {
  try {
    const stackName: string = core.getInput('stackName')

    const client: CloudFormationClient = new CloudFormationClient({
      region: 'us-west-2',
      customUserAgent: 'github-action'
    })
    const params = {
      StackName: stackName
    }
    const command = new DeleteStackCommand(params)
    try {
      await client.send(command)
    } catch (error) {
      // error handling.
    } finally {
      // finally.
    }
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
