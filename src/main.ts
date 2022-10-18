import * as core from '@actions/core'
import {
  CloudFormationClient,
  DeleteStackCommand,
  paginateDescribeStacks
} from '@aws-sdk/client-cloudformation'

const isEmptyString = (data: string): boolean =>
  typeof data === 'string' && data.trim().length === 0

interface StackTag {
  tagName: string
  tagValue: string
}

async function run(): Promise<void> {
  try {
    const stackTags: StackTag[] = []

    const awsRegionInput: string = core.getInput('awsRegion').trim()
    const stackNamesInput: string = core.getInput('stackNames').trim()
    const stackTagsInput: string = core.getInput('stackTags').trim()

    if (isEmptyString(awsRegionInput)) {
      core.setFailed('awsRegion is required')
      return
    }
    if (isEmptyString(stackNamesInput) && isEmptyString(stackTagsInput)) {
      core.setFailed('stackNames or stackTags is required')
      return
    }

    const client: CloudFormationClient = new CloudFormationClient({
      region: awsRegionInput
    })

    if (!isEmptyString(stackNamesInput)) {
      for (const stackName of stackNamesInput.split(',')) {
        // try to delete any stacks with this name
        try {
          core.info(`Deleting Stack ${stackName} in ${awsRegionInput}...`)
          await client.send(
            new DeleteStackCommand({StackName: stackName.trim()})
          )
        } catch (error) {
          core.error(`Unable to delete ${stackName}`)
        } finally {
          // finally.
        }
      }
    }

    if (!isEmptyString(stackTagsInput)) {
      try {
        for (const tagNameValue of stackTagsInput.split(',')) {
          const splitTagArray = tagNameValue.trim().split('==', 2)
          stackTags.push({
            tagName: splitTagArray[0].trim(),
            tagValue: splitTagArray[1].trim()
          })
        }
      } catch (err: unknown) {
        core.error('Error parsing StackTags.')
        throw err
      }
    }
    if (stackTags.length > 0) {
      const stackNamesFromTags: string[] = []
      for await (const page of paginateDescribeStacks({client}, {})) {
        if (page.Stacks) {
          for (const stack of page.Stacks) {
            // Find stacks with matching stackTags
            let match = true
            for (const stackTag of stackTags) {
              if (
                !stack.Tags?.find(obj => {
                  return (
                    obj.Key === stackTag.tagName &&
                    obj.Value === stackTag.tagValue
                  )
                })
              ) {
                match = false
                break
              }
            }
            if (match) {
              stackNamesFromTags.push(stack.StackName as string)
            }
          }
        }
      }
      for (const stackName of stackNamesFromTags) {
        // try to delete any stacks with this name
        try {
          core.info(`Deleting Stack ${stackName} in ${awsRegionInput}...`)
          await client.send(
            new DeleteStackCommand({StackName: stackName.trim()})
          )
        } catch (error) {
          core.error(`Unable to delete ${stackName}`)
        } finally {
          // finally.
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
