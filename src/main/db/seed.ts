import { nanoid } from 'nanoid'
import { getDb, schema } from './client'

const { links, tags, linkTags, relations, collections, collectionLinks } = schema

function parentDir(p: string): string {
  const i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
  return i > 0 ? p.slice(0, i) : p
}

/** 첫 실행 시 데모 그래프를 채운다 (links 테이블이 비어 있을 때만).
 *  HW/FW 개발자 기준 샘플: 실제 자료 링크 + 로컬 파일/폴더 더미. */
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
    { name: 'Protocol', color: '#EF4444' }
  ]
  const tagIds: Record<string, string> = {}
  for (const t of tagDefs) {
    const id = nanoid()
    tagIds[t.name] = id
    await db.insert(tags).values({ id, name: t.name, color: t.color }).run()
  }

  // ── Links (web + 로컬 파일/폴더 더미) ────────────────────
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
    { key: 'cubeide', kind: 'web', title: 'STM32CubeIDE', url: 'https://www.st.com/en/development-tools/stm32cubeide.html', desc: 'STM32용 통합 개발 환경 (Eclipse + GCC).', tags: ['MCU', 'Toolchain'], favorite: true },
    { key: 'cubemx', kind: 'web', title: 'STM32CubeMX', url: 'https://www.st.com/en/development-tools/stm32cubemx.html', desc: '핀맵·클럭·주변장치 초기화 코드 생성기.', tags: ['MCU', 'Toolchain'] },
    { key: 'freertos', kind: 'web', title: 'FreeRTOS', url: 'https://www.freertos.org', desc: '경량 실시간 운영체제 커널.', tags: ['RTOS'], favorite: true },
    { key: 'zephyr', kind: 'web', title: 'Zephyr Project', url: 'https://www.zephyrproject.org', desc: '디바이스 트리 기반 스케일러블 RTOS.', tags: ['RTOS'] },
    { key: 'ncs', kind: 'web', title: 'nRF Connect SDK', url: 'https://www.nordicsemi.com/Products/Development-software/nRF-Connect-SDK', desc: 'Nordic nRF52/53/91 BLE·Matter SDK (Zephyr 기반).', tags: ['MCU', 'RTOS'] },
    { key: 'espidf', kind: 'web', title: 'ESP-IDF', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', desc: 'Espressif ESP32 공식 개발 프레임워크.', tags: ['MCU', 'RTOS'] },
    { key: 'rp2040', kind: 'web', title: 'RP2040 Datasheet', url: 'https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf', desc: 'Raspberry Pi RP2040 (Dual Cortex-M0+) 데이터시트.', tags: ['MCU', 'Datasheet'] },
    { key: 'cortexm4', kind: 'web', title: 'ARM Cortex-M4 TRM', url: 'https://developer.arm.com/documentation/100166/latest/', desc: 'Cortex-M4 Technical Reference Manual.', tags: ['MCU', 'Datasheet'] },
    { key: 'cmsis', kind: 'web', title: 'CMSIS', url: 'https://www.arm.com/technologies/cmsis', desc: 'Cortex MCU 소프트웨어 인터페이스 표준.', tags: ['MCU', 'Toolchain'] },
    { key: 'kicad', kind: 'web', title: 'KiCad EDA', url: 'https://www.kicad.org', desc: '오픈소스 회로도·PCB 설계 도구.', tags: ['PCB/EDA'] },
    { key: 'armgcc', kind: 'web', title: 'Arm GNU Toolchain', url: 'https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads', desc: 'arm-none-eabi-gcc 크로스 컴파일 툴체인.', tags: ['Toolchain'] },
    { key: 'openocd', kind: 'web', title: 'OpenOCD', url: 'https://openocd.org', desc: '온칩 디버깅·플래시 (JTAG/SWD).', tags: ['Debug', 'Toolchain'] },
    { key: 'jlink', kind: 'web', title: 'SEGGER J-Link', url: 'https://www.segger.com/products/debug-probes/j-link/', desc: '고속 디버그 프로브 + RTT 로깅.', tags: ['Debug'] },
    { key: 'saleae', kind: 'web', title: 'Saleae Logic', url: 'https://www.saleae.com', desc: '로직 애널라이저 + 프로토콜 디코더.', tags: ['Debug', 'Protocol'] },
    { key: 'platformio', kind: 'web', title: 'PlatformIO', url: 'https://platformio.org', desc: '멀티플랫폼 임베디드 빌드·의존성 관리.', tags: ['Toolchain'] },
    { key: 'i2cspec', kind: 'web', title: 'I2C Spec (UM10204)', url: 'https://www.nxp.com/docs/en/user-guide/UM10204.pdf', desc: 'NXP I2C 버스 사양서.', tags: ['Protocol', 'Datasheet'] },
    // 로컬 파일/폴더 더미 (경로는 예시)
    { key: 'fwrepo', kind: 'folder', title: 'smart-sensor-fw', url: 'C:\\Projects\\smart-sensor-fw', desc: 'BLE 스마트 센서 노드 펌웨어 저장소.', tags: ['MCU', 'RTOS'], favorite: true },
    { key: 'mainc', kind: 'file', title: 'main.c — Sensor Task', url: 'C:\\Projects\\smart-sensor-fw\\src\\main.c', desc: '센서 샘플링 + BLE 통지 태스크.', tags: ['MCU', 'RTOS'], note: '# TODO\n- ADC DMA 더블버퍼링\n- STOP 모드 저전력 진입 검증\n- BLE 연결 간격 튜닝' },
    { key: 'ds407', kind: 'file', title: 'STM32F407 Datasheet.pdf', url: 'C:\\Datasheets\\STM32F407.pdf', desc: 'STM32F407VG 데이터시트 (로컬 보관).', tags: ['MCU', 'Datasheet'] }
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

  await rel('cubemx', 'cubeide', 'related', 'generates for')
  await rel('cubeide', 'armgcc', 'uses', 'uses')
  await rel('platformio', 'armgcc', 'uses', 'uses')
  await rel('espidf', 'freertos', 'uses', 'uses')
  await rel('ncs', 'zephyr', 'uses', 'uses')
  await rel('cmsis', 'cortexm4', 'part_of', 'part of')
  await rel('openocd', 'jlink', 'related', 'alt. probe')
  await rel('saleae', 'i2cspec', 'related', 'decodes')
  await rel('mainc', 'fwrepo', 'part_of', 'part of')
  await rel('fwrepo', 'ncs', 'uses', 'built on')
  // 태그 노드 표시용
  await rel('MCU', 'cubeide', 'related', 'MCU', 'tag')
  await rel('RTOS', 'zephyr', 'related', 'RTOS', 'tag')
  await rel('Debug', 'jlink', 'related', 'Debug', 'tag')

  // ── Collections (폴더) + 멤버십 ──────────────────────────
  const colDefs: { name: string; members: string[] }[] = [
    { name: 'Project: Smart Sensor Node', members: ['fwrepo', 'mainc', 'ncs', 'zephyr', 'ds407', 'i2cspec'] },
    { name: 'Datasheets & References', members: ['rp2040', 'cortexm4', 'i2cspec', 'ds407', 'cmsis'] },
    { name: 'Toolchain & Debug', members: ['armgcc', 'platformio', 'openocd', 'jlink', 'saleae', 'cubeide'] },
    { name: 'RTOS', members: ['freertos', 'zephyr', 'espidf', 'ncs'] }
  ]
  for (const col of colDefs) {
    const id = nanoid()
    await db.insert(collections).values({ id, name: col.name, createdAt: now }).run()
    for (const key of col.members) {
      await db.insert(collectionLinks).values({ collectionId: id, linkId: linkIds[key] }).run()
    }
  }
}
