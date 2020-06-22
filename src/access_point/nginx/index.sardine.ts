import * as proc from 'process'
import * as path from 'path'


import { NginxReverseProxy, NginxConfig } from './nginx_reverse_proxy'


let proxy: NginxReverseProxy|null = null

export const setup = async (
  nginxConfig: NginxConfig,
  nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
  nginxConfigDir: string = '/etc/nginx/conf.d/',
  sslCrtLines: string[],
  sslKeyLines: string[],
) => {
  proxy = new NginxReverseProxy(nginxConfig, nginxConfigFilePath, nginxConfigDir, sslCrtLines, sslKeyLines)
  let res = null
  try {
    res = await proxy.start({initalizeConfigFile: true})
  }catch(e) {
    res = {error: e}
  }
  
  return {
    res: res,
    key: proxy.sslKey,
    crt: proxy.sslCrt,
    random: 1234,
    inputKey: sslKeyLines,
    inputCrt: sslCrtLines,
    fakeInputCrt: [
      "-----BEGIN CERTIFICATE-----",
      "MIIDnTCCAoWgAwIBAgIULh9ytvFibu+no3ItFiKFdCIHDzUwDQYJKoZIhvcNAQEL",
      "BQAwXjELMAkGA1UEBhMCQ04xETAPBgNVBAgMCFNoYW5kb25nMQ4wDAYDVQQHDAVK",
      "aW5hbjEaMBgGA1UECgwRTmF0dXJlV2FrZSBDbyBMdGQxEDAOBgNVBAMMB253LXRl",
      "c3QwHhcNMjAwNjIyMDMyMzAwWhcNMjEwNjIyMDMyMzAwWjBeMQswCQYDVQQGEwJD",
      "TjERMA8GA1UECAwIU2hhbmRvbmcxDjAMBgNVBAcMBUppbmFuMRowGAYDVQQKDBFO",
      "YXR1cmVXYWtlIENvIEx0ZDEQMA4GA1UEAwwHbnctdGVzdDCCASIwDQYJKoZIhvcN",
      "AQEBBQADggEPADCCAQoCggEBAKJ73QiZUqLQ7jYLds6hUZxx9gYEA033OgmiN1he",
      "xEdXAVQbF7czknxH7m24ESMpllHw8ZkSOgRtGAbIta3Oq0OQySO2BNKr9vHwEfYL",
      "xpeRZL45SIAPw2T/yWGzC2lEJY7a+2m4EW3lY8cf0ReYjOvgtFb+6r9b5IBZBgkl",
      "B8n1MGlaalwMCmXLYrAH2aI+6qJ0t8sPgP36u7STMUFgfZ8Kdetw0p/1Vf8QgFEH",
      "Bzuf7Ocf9o0JOu5pRW2Q00zg+tza4DN/HMO3F4EICBVI/zqYAFOt8V00pihuN2SM",
      "fgbBIExYODLPSJv3gA6NZcfkgjqgKyMFkZYMH/lKSTtBEA0CAwEAAaNTMFEwHQYD",
      "VR0OBBYEFD9HqQC4mZGXIFI/OIkK5p5Q/sguMB8GA1UdIwQYMBaAFD9HqQC4mZGX",
      "IFI/OIkK5p5Q/sguMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEB",
      "AFcZs7qCq/LoTAJnOHeF70rtawzgyGOaUWBOT+zlp+UeOdPjDlxA9BCIyKap/rJ2",
      "rmjNZyrKS3X8Ii3sQOaxVg5aT4/+8AHX3or4wd7QtElYvD4lNlz+0e4cYXsr+BoY",
      "M2UO5SSjX+JB+o6WaQxPjYEyw2eUpkKUchRReKUoTczRa7+PB2T7xxyySpTQhrJw",
      "Hk3xdPDMFd68+vJa1uN8Yj6vNoerlaVp/rxbwoODhWxBXs2+Z/SWwXoE6txaFvwW",
      "s9D6MUT0PoC+rlBcDqkCWFqkuQEJxSCYV2vp30pVSjqnG020gWxiwmEF8cZNVGai",
      "a6uNB4X9xN+cYJ9kteZkjM8=",
      "-----END CERTIFICATE-----"
    ]
      ,
    fakeInputKey: [
        "-----BEGIN PRIVATE KEY-----",
        "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCie90ImVKi0O42",
        "C3bOoVGccfYGBANN9zoJojdYXsRHVwFUGxe3M5J8R+5tuBEjKZZR8PGZEjoEbRgG",
        "yLWtzqtDkMkjtgTSq/bx8BH2C8aXkWS+OUiAD8Nk/8lhswtpRCWO2vtpuBFt5WPH",
        "H9EXmIzr4LRW/uq/W+SAWQYJJQfJ9TBpWmpcDAply2KwB9miPuqidLfLD4D9+ru0",
        "kzFBYH2fCnXrcNKf9VX/EIBRBwc7n+znH/aNCTruaUVtkNNM4Prc2uAzfxzDtxeB",
        "CAgVSP86mABTrfFdNKYobjdkjH4GwSBMWDgyz0ib94AOjWXH5II6oCsjBZGWDB/5",
        "Skk7QRANAgMBAAECggEBAIQgrzwn2e/2cE9YgTNEMWZDsalwp/NFoFdnJxRgc8ID",
        "eVwYb++VK4COyc9FCAKM9eUKRpyQGsewowIZQsvkrJZT7YxxnnhmSHizHRf0uXhV",
        "ThP15wPkTaMa8XrWKuhd9yC06A8vFFVGXR32vIQwlB/X6S55OxGDO0w3mFXlW/EY",
        "elv+1G2McjtSEKqe9EcAvpAz3xy+Supd1R80sZ/x8NbIrtj/rtuuamI++NNFQxD0",
        "wVpnmvpJbSFaYaVncnmV1xJI2sBie31u7wtyo89x5iycNFpaXMfkh9uB34vW3FoF",
        "TVpmPO55AsPhLS8emBTwFL9vmiFM6S7zC6/5Pb3fue0CgYEA1H3hmgSAnudeyrId",
        "xtLT4qfys37acHbuISgfIaY6ePkmC1OIBQjklkb8vkrkTFS/hxr1+xDOFIfigwZo",
        "SzxZNCDGFNH+QJyNi56C7qGo1/NtU13g8ZjDlrD9VDiXYjQ7EjIQbeutfpDoAFBI",
        "OXzLFRfDoBDzmoMf3F9bTtwaNL8CgYEAw8C7rG7Y/qxobw/Fcj6EMxFAQOgvIQA2",
        "ZJlPC4Pc0km93TvOiZo/uSskRb9+NrH61J8RVApvlGPs2KAnKb2DMf6RlAhCphL3",
        "PZCIdLcpSNkfji48N4qF0qqzqs/jmnOU3iFViVuv3+8TKfLtvvXKc4g54Acxzlvn",
        "RSD2xpLU8jMCgYBSgdpielMS4FXfMI/9Tol1Xa8QYTYiKxvFhhWodCoKJPvPtAyB",
        "n/VaIJAst1m0BcgkhqRyaxEJycV7CLbgV7tvUTZ4iR1HK0KOruq6C81KpLuTfkVE",
        "qgNv9KM424x0VkGFjCjy9Wr1VQCwdnvEzp7wPrz33v0nxrhNUj1a/n2ycwKBgDB+",
        "0v/JBmExfT3mflfrPP0ZzP1HiEV4tAEAKiEELfS66Bqi8mwMlrTdB0NwSWhrd2St",
        "c7GKVFJC3y5bntgsZxA/rPkrgrd6A15xLB0eM1Ak2jhzI9/upXCncZNjpVNiRwMw",
        "5uv8lvm3VNwTnuqsIde1bAEgRyqEgisSG5DeV3sZAoGBAKMjGmhu05mcRMOCbFMD",
        "XBuMMtRK/qMem3OQp7XyZwbGRTWu8naTcRbpjTRFasYoj9QqCbzZ//1eCY0rNIYK",
        "uoVPbLoNzyYLKXgO2mjVbW15f2hfqj6rKAY9a2GL9QkYA+R1xEgS4r+IErd1iMo+",
        "PzKWdWi9OuYkbLdaQgqjlqQV",
        "-----END PRIVATE KEY-----"
      ]
  }
}

export const execCmd = async(cmd:string) => {
  if (!proxy) return null
  else return await proxy.exec(cmd)
}

export const test = async() => {
  if (!proxy) return null
  return `current dir: ${proc.cwd()}, key dir: ${path.resolve(proc.cwd(), './keys')}, key: ${proxy!.sslKey}, crt: ${proxy!.sslCrt}`
}