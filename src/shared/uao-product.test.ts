import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  UAO_APP_ID,
  UAO_GITHUB_OWNER,
  UAO_GITHUB_REPO,
  UAO_MOBILE_ANDROID_PACKAGE,
  UAO_PRODUCT_NAME
} from './uao-product'

describe('UAO product identity', () => {
  it('matches uao/product.json', () => {
    const product: unknown = JSON.parse(readFileSync(resolve('uao/product.json'), 'utf8'))
    expect(product).toMatchObject({
      productName: UAO_PRODUCT_NAME,
      appId: UAO_APP_ID,
      mobileAndroidPackage: UAO_MOBILE_ANDROID_PACKAGE,
      githubOwner: UAO_GITHUB_OWNER,
      githubRepo: UAO_GITHUB_REPO
    })
  })
})
