import { nanoid } from 'nanoid'
import { getDb, schema } from './client'

const { links, tags, linkTags, relations, collections, collectionLinks } = schema

function parentDir(p: string): string {
  const i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
  return i > 0 ? p.slice(0, i) : p
}

/** 첫 실행 시 데모 그래프를 채운다 (links 테이블이 비어 있을 때만).
 *  HW/FW 개발자 기준: 웹 자료 + 로컬 데이터시트/보고서/측정/소스/회로 파일. */
export async function seedIfEmpty(): Promise<void> {
  const db = getDb()
  const existing = await db.select().from(links).all()
  if (existing.length > 0) return

  const now = new Date()
  const fav = (domain: string): string =>
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

  // ── Tags ──────────────────────────────────────────────
  const tagDefs = [
    { name: 'MCU', color: '#3B82F6' },
    { name: 'RTOS', color: '#22C55E' },
    { name: 'PCB/EDA', color: '#F97316' },
    { name: 'Datasheet', color: '#A855F7' },
    { name: 'Toolchain', color: '#EAB308' },
    { name: 'Debug', color: '#14B8A6' },
    { name: 'Protocol', color: '#EF4444' },
    { name: 'Test/Report', color: '#0EA5E9' }
  ]
  const tagIds: Record<string, string> = {}
  for (const t of tagDefs) {
    const id = nanoid()
    tagIds[t.name] = id
    await db.insert(tags).values({ id, name: t.name, color: t.color }).run()
  }

  // ── Links ─────────────────────────────────────────────
  type Def = {
    key: string
    kind: 'web' | 'file' | 'folder'
    title: string
    url: string
    desc: string
    tags: string[]
    favorite?: boolean
    note?: string
  }
  const linkDefs: Def[] = [
    // ── 웹 자료 ──
    { key: 'cubeide', kind: 'web', title: 'STM32CubeIDE', url: 'https://www.st.com/en/development-tools/stm32cubeide.html', desc: 'STM32 통합 개발 환경 (Eclipse + GCC).', tags: ['MCU', 'Toolchain'], favorite: true },
    { key: 'cubemx', kind: 'web', title: 'STM32CubeMX', url: 'https://www.st.com/en/development-tools/stm32cubemx.html', desc: '핀맵·클럭·주변장치 초기화 코드 생성기.', tags: ['MCU', 'Toolchain'] },
    { key: 'freertos', kind: 'web', title: 'FreeRTOS', url: 'https://www.freertos.org', desc: '경량 실시간 운영체제 커널.', tags: ['RTOS'] },
    { key: 'zephyr', kind: 'web', title: 'Zephyr Project', url: 'https://www.zephyrproject.org', desc: '디바이스 트리 기반 스케일러블 RTOS.', tags: ['RTOS'] },
    { key: 'ncs', kind: 'web', title: 'nRF Connect SDK', url: 'https://www.nordicsemi.com/Products/Development-software/nRF-Connect-SDK', desc: 'Nordic nRF52/53 BLE·Matter SDK (Zephyr).', tags: ['MCU', 'RTOS'] },
    { key: 'espidf', kind: 'web', title: 'ESP-IDF', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', desc: 'Espressif ESP32 공식 개발 프레임워크.', tags: ['MCU', 'RTOS'] },
    { key: 'cmsis', kind: 'web', title: 'CMSIS', url: 'https://www.arm.com/technologies/cmsis', desc: 'Cortex MCU 소프트웨어 인터페이스 표준.', tags: ['MCU', 'Toolchain'] },
    { key: 'cortexm4', kind: 'web', title: 'ARM Cortex-M4 TRM', url: 'https://developer.arm.com/documentation/100166/latest/', desc: 'Cortex-M4 Technical Reference Manual.', tags: ['MCU', 'Datasheet'] },
    { key: 'kicad', kind: 'web', title: 'KiCad EDA', url: 'https://www.kicad.org', desc: '오픈소스 회로도·PCB 설계 도구.', tags: ['PCB/EDA'] },
    { key: 'armgcc', kind: 'web', title: 'Arm GNU Toolchain', url: 'https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads', desc: 'arm-none-eabi-gcc 크로스 컴파일 툴체인.', tags: ['Toolchain'] },
    { key: 'openocd', kind: 'web', title: 'OpenOCD', url: 'https://openocd.org', desc: '온칩 디버깅·플래시 (JTAG/SWD).', tags: ['Debug', 'Toolchain'] },
    { key: 'jlink', kind: 'web', title: 'SEGGER J-Link', url: 'https://www.segger.com/products/debug-probes/j-link/', desc: '고속 디버그 프로브 + RTT.', tags: ['Debug'] },
    { key: 'saleae', kind: 'web', title: 'Saleae Logic', url: 'https://www.saleae.com', desc: '로직 애널라이저 + 프로토콜 디코더.', tags: ['Debug', 'Protocol'] },
    { key: 'i2cspec', kind: 'web', title: 'I2C Spec (UM10204)', url: 'https://www.nxp.com/docs/en/user-guide/UM10204.pdf', desc: 'NXP I2C 버스 사양서.', tags: ['Protocol', 'Datasheet'] },

    // ── 로컬: 데이터시트 / 앱노트 (PDF) ──
    { key: 'ds_stm32', kind: 'file', title: 'STM32F407VG Datasheet.pdf', url: 'C:\\Engineering\\Datasheets\\STM32F407VG.pdf', desc: '메인 MCU 데이터시트.', tags: ['Datasheet', 'MCU'] },
    { key: 'ds_bme280', kind: 'file', title: 'BME280 Datasheet.pdf', url: 'C:\\Engineering\\Datasheets\\BME280_humidity_pressure.pdf', desc: 'Bosch 환경센서 (I2C 0x76).', tags: ['Datasheet', 'Protocol'] },
    { key: 'ds_tps', kind: 'file', title: 'TPS62840 Buck Datasheet.pdf', url: 'C:\\Engineering\\Datasheets\\TPS62840_buck.pdf', desc: 'TI 초저전력 벅 컨버터.', tags: ['Datasheet', 'PCB/EDA'] },
    { key: 'ds_nrf', kind: 'file', title: 'nRF52840 Product Spec.pdf', url: 'C:\\Engineering\\Datasheets\\nRF52840_PS_v1.7.pdf', desc: 'Nordic BLE SoC 사양서.', tags: ['Datasheet', 'MCU'] },
    { key: 'an_timer', kind: 'file', title: 'AN4013 STM32 Timer Cookbook.pdf', url: 'C:\\Engineering\\Datasheets\\AppNotes\\AN4013_STM32_timers.pdf', desc: 'ST 타이머 활용 앱노트.', tags: ['Datasheet', 'MCU'] },

    // ── 로컬: 펌웨어 프로젝트 ──
    { key: 'fwrepo', kind: 'folder', title: 'smart-sensor / firmware', url: 'C:\\Projects\\smart-sensor\\firmware', desc: 'BLE 스마트 센서 노드 펌웨어 저장소.', tags: ['MCU', 'RTOS'], favorite: true },
    { key: 'mainc', kind: 'file', title: 'main.c — Sensor Task', url: 'C:\\Projects\\smart-sensor\\firmware\\src\\main.c', desc: '센서 샘플링 + BLE 통지 메인 태스크.', tags: ['MCU', 'RTOS'], note: '# TODO\n- ADC DMA 더블버퍼링\n- STOP 모드 저전력 진입 검증\n- BLE 연결 간격 튜닝' },
    { key: 'bmedrv', kind: 'file', title: 'bme280.c — I2C Driver', url: 'C:\\Projects\\smart-sensor\\firmware\\src\\bme280.c', desc: 'BME280 I2C 드라이버 + 보정 연산.', tags: ['MCU', 'Protocol'] },
    { key: 'fwhex', kind: 'file', title: 'smart-sensor_v0.9.3.hex', url: 'C:\\Projects\\smart-sensor\\firmware\\build\\smart-sensor_v0.9.3.hex', desc: '릴리스 후보 빌드 산출물.', tags: ['MCU', 'Toolchain'] },

    // ── 로컬: 회로 / PCB ──
    { key: 'hwrepo', kind: 'folder', title: 'smart-sensor / hardware', url: 'C:\\Projects\\smart-sensor\\hardware', desc: 'KiCad 회로도·PCB 프로젝트.', tags: ['PCB/EDA'] },
    { key: 'kicadpro', kind: 'file', title: 'smart-sensor.kicad_pro', url: 'C:\\Projects\\smart-sensor\\hardware\\smart-sensor.kicad_pro', desc: 'KiCad 프로젝트 파일 (Rev 1.2).', tags: ['PCB/EDA'] },
    { key: 'bom', kind: 'file', title: 'BOM_smart-sensor_v1.2.xlsx', url: 'C:\\Projects\\smart-sensor\\hardware\\BOM_smart-sensor_v1.2.xlsx', desc: '자재 명세서 (발주용).', tags: ['PCB/EDA'] },
    { key: 'gerber', kind: 'file', title: 'Gerber_v1.2.zip', url: 'C:\\Projects\\smart-sensor\\hardware\\fab\\Gerber_v1.2.zip', desc: 'PCB 제조 파일 (fab 발주).', tags: ['PCB/EDA'] },

    // ── 로컬: 실험 / 측정 보고서 ──
    { key: 'pwrreport', kind: 'file', title: 'Power Consumption Report 2026-05.md', url: 'C:\\Projects\\smart-sensor\\reports\\Power_Consumption_2026-05.md', desc: '슬립 12µA / 액티브 6.4mA, 코인셀 추정 14개월.', tags: ['Test/Report'], favorite: true, note: '# 전력 측정 요약\n- Sleep: 12 µA @ 3.0V\n- Active(BLE TX): 6.4 mA\n- CR2032 기준 ~14개월\n- 개선: ADC 샘플 주기 ↓, TX power -4dBm' },
    { key: 'thermal', kind: 'file', title: 'Thermal Test 85C Report.pdf', url: 'C:\\Projects\\smart-sensor\\reports\\Thermal_Test_85C.pdf', desc: '고온 85℃ 동작 신뢰성 시험 결과.', tags: ['Test/Report'] },
    { key: 'emc', kind: 'file', title: 'EMC Pre-Scan Results.pdf', url: 'C:\\Projects\\smart-sensor\\reports\\EMC_PreScan_Results.pdf', desc: '방사 EMI 사전 스캔 (30M~1GHz).', tags: ['Test/Report'] },
    { key: 'blerange', kind: 'file', title: 'BLE Range Test.csv', url: 'C:\\Projects\\smart-sensor\\reports\\BLE_Range_Test.csv', desc: 'RSSI vs 거리 측정 로그.', tags: ['Test/Report', 'Debug'] },

    // ── 로컬: 캡처 / 로그 ──
    { key: 'i2ccap', kind: 'file', title: 'i2c_bme280_0x76.sal', url: 'C:\\Projects\\smart-sensor\\captures\\i2c_bme280_0x76.sal', desc: 'Saleae I2C 캡처 (센서 초기화 시퀀스).', tags: ['Debug', 'Protocol'] },
    { key: 'bringup', kind: 'file', title: 'bringup-log.md', url: 'C:\\Projects\\smart-sensor\\bringup-log.md', desc: '보드 브링업 기록 (Rev1.2 이슈 포함).', tags: ['Test/Report', 'Debug'], note: '# Bring-up Log (Rev1.2)\n- 3V3 레일 정상\n- SWD 인식 OK (J-Link)\n- I2C 풀업 4.7k→2.2k 교체 후 안정\n- BME280 chip-id 0x60 확인' }
  ]

  const linkIds: Record<string, string> = {}
  for (const l of linkDefs) {
    const id = nanoid()
    linkIds[l.key] = id
    const domain =
      l.kind === 'web' ? new URL(l.url).hostname.replace(/^www\./, '') : parentDir(l.url)
    const favicon = l.kind === 'web' ? fav(domain) : null
    await db
      .insert(links)
      .values({
        id,
        kind: l.kind,
        title: l.title,
        url: l.url,
        description: l.desc,
        favicon,
        thumbnail: null,
        note: l.note ?? null,
        content: null,
        domain,
        favorite: l.favorite ?? false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now
      })
      .run()
    for (const tn of l.tags) {
      await db.insert(linkTags).values({ linkId: id, tagId: tagIds[tn] }).run()
    }
  }

  // ── Relations (type=스타일, label=표시) ───────────────────
  const rel = async (
    sourceKey: string,
    targetKey: string,
    type: string,
    label: string | null,
    sourceKind: 'link' | 'tag' = 'link'
  ): Promise<void> => {
    const sourceId = sourceKind === 'tag' ? tagIds[sourceKey] : linkIds[sourceKey]
    await db
      .insert(relations)
      .values({
        id: nanoid(),
        sourceId,
        sourceKind,
        targetId: linkIds[targetKey],
        targetKind: 'link',
        type,
        label,
        createdAt: now
      })
      .run()
  }

  await rel('mainc', 'fwrepo', 'part_of', 'part of')
  await rel('bmedrv', 'fwrepo', 'part_of', 'part of')
  await rel('fwhex', 'fwrepo', 'related', 'build output')
  await rel('mainc', 'bmedrv', 'uses', 'driver')
  await rel('bmedrv', 'ds_bme280', 'uses', 'register map')
  await rel('fwrepo', 'ncs', 'uses', 'built on')
  await rel('fwrepo', 'cubeide', 'uses', 'IDE')
  await rel('kicadpro', 'hwrepo', 'part_of', 'part of')
  await rel('bom', 'kicadpro', 'related', 'BOM')
  await rel('gerber', 'kicadpro', 'related', 'fab output')
  await rel('ds_tps', 'hwrepo', 'related', 'power stage')
  await rel('pwrreport', 'fwrepo', 'related', 'measured on')
  await rel('i2ccap', 'i2cspec', 'related', 'decodes')
  await rel('i2ccap', 'ds_bme280', 'related', 'addr 0x76')
  await rel('emc', 'hwrepo', 'related', 'DUT')
  await rel('cmsis', 'cortexm4', 'part_of', 'part of')
  // 태그 노드 표시용
  await rel('MCU', 'cubeide', 'related', 'MCU', 'tag')
  await rel('RTOS', 'zephyr', 'related', 'RTOS', 'tag')
  await rel('Datasheet', 'ds_stm32', 'related', 'Datasheet', 'tag')
  await rel('Test/Report', 'pwrreport', 'related', 'Report', 'tag')
  await rel('PCB/EDA', 'kicadpro', 'related', 'PCB', 'tag')

  // ── Collections (폴더) + 멤버십 ──────────────────────────
  const colDefs: { name: string; members: string[] }[] = [
    {
      name: 'Project: Smart Sensor Node',
      members: ['fwrepo', 'mainc', 'bmedrv', 'hwrepo', 'kicadpro', 'bom', 'pwrreport', 'blerange', 'ds_bme280', 'ds_stm32', 'ncs']
    },
    {
      name: 'Datasheets & App Notes',
      members: ['ds_stm32', 'ds_bme280', 'ds_tps', 'ds_nrf', 'an_timer', 'cortexm4', 'i2cspec', 'cmsis']
    },
    {
      name: 'Test Reports & Measurements',
      members: ['pwrreport', 'thermal', 'emc', 'blerange', 'i2ccap', 'bringup']
    },
    {
      name: 'Schematic & PCB',
      members: ['hwrepo', 'kicadpro', 'bom', 'gerber', 'kicad', 'ds_tps']
    },
    {
      name: 'Firmware & Toolchain',
      members: ['fwrepo', 'mainc', 'bmedrv', 'fwhex', 'armgcc', 'cubeide', 'cubemx', 'openocd', 'jlink']
    },
    { name: 'RTOS & SDK', members: ['freertos', 'zephyr', 'ncs', 'espidf'] }
  ]
  for (const col of colDefs) {
    const id = nanoid()
    await db.insert(collections).values({ id, name: col.name, createdAt: now }).run()
    for (const key of col.members) {
      await db.insert(collectionLinks).values({ collectionId: id, linkId: linkIds[key] }).run()
    }
  }
}
