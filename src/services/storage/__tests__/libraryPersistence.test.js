import 'fake-indexeddb/auto';
import assert from 'node:assert';
import test from 'node:test';
import { db } from '../db.js';
import { TrackRepository } from '../TrackRepository.js';
import { FileSourceResolver } from '../../platform/fileSourceResolver.js';
import {
  LibraryManager,
  computeFingerprint,
  parseMetadataFromFilename,
} from '../../library/LibraryManager.js';
import { createSourceDescriptor } from '../../../types/trackSource.js';

test('Library Persistence: TrackRepository CRUD & Cascade Deletion', async (t) => {
  await t.test('addTrack stores track record and auto-generates lowercase index fields', async () => {
    await TrackRepository.clearAll();

    const track = {
      trackId: 'trk_test_1',
      sourceFingerprint: '1024_1700000000_song.mp3',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      duration: 354,
      isAvailable: 1,
      source: createSourceDescriptor('web_session_file', 'trk_test_1', 'song.mp3', 1024, 1700000000),
    };

    const id = await TrackRepository.addTrack(track);
    assert.strictEqual(id, 'trk_test_1');

    const fetched = await TrackRepository.getTrackById('trk_test_1');
    assert.ok(fetched);
    assert.strictEqual(fetched.title, 'Bohemian Rhapsody');
    assert.strictEqual(fetched.title_lower, 'bohemian rhapsody');
    assert.strictEqual(fetched.artist_lower, 'queen');
    assert.strictEqual(fetched.album_lower, 'a night at the opera');
    assert.strictEqual(fetched.isAvailable, 1);
  });

  await t.test('findTrackByFingerprint retrieves matching existing track', async () => {
    const found = await TrackRepository.findTrackByFingerprint('1024_1700000000_song.mp3');
    assert.ok(found);
    assert.strictEqual(found.trackId, 'trk_test_1');

    const notFound = await TrackRepository.findTrackByFingerprint('non_existent_fingerprint');
    assert.strictEqual(notFound, null);
  });

  await t.test('updateTrackMetadata updates metadata without touching file or other fields', async () => {
    const updated = await TrackRepository.updateTrackMetadata('trk_test_1', {
      title: 'Bohemian Rhapsody (2011 Remaster)',
      artist: 'Queen Remastered',
      album: 'Greatest Hits',
    });

    assert.strictEqual(updated.title, 'Bohemian Rhapsody (2011 Remaster)');
    assert.strictEqual(updated.title_lower, 'bohemian rhapsody (2011 remaster)');
    assert.strictEqual(updated.artist, 'Queen Remastered');
    assert.strictEqual(updated.album, 'Greatest Hits');

    const fetched = await TrackRepository.getTrackById('trk_test_1');
    assert.strictEqual(fetched.title, 'Bohemian Rhapsody (2011 Remaster)');
    assert.strictEqual(fetched.duration, 354); // Field lain tetap utuh
  });

  await t.test('setTrackAvailability toggles availability flag', async () => {
    await TrackRepository.setTrackAvailability('trk_test_1', 0);
    let fetched = await TrackRepository.getTrackById('trk_test_1');
    assert.strictEqual(fetched.isAvailable, 0);

    await TrackRepository.setTrackAvailability('trk_test_1', 1);
    fetched = await TrackRepository.getTrackById('trk_test_1');
    assert.strictEqual(fetched.isAvailable, 1);
  });

  await t.test('deleteTrack executes cascade deletion across all related tables', async () => {
    // Tambahkan dummy data ke tabel relasi
    await db.fileHandles.put({ trackId: 'trk_test_1', handle: { name: 'handle' } });
    await db.playlistTracks.put({ id: 1, playlistId: 10, trackId: 'trk_test_1', orderIndex: 0 });
    await db.activeQueue.put({ id: 1, trackId: 'trk_test_1', queueIndex: 0 });
    await db.playbackHistory.put({ id: 1, trackId: 'trk_test_1', playedAt: Date.now() });

    // Hapus track
    await TrackRepository.deleteTrack('trk_test_1');

    // Verifikasi semua relasi bersih (no orphan records)
    const track = await TrackRepository.getTrackById('trk_test_1');
    assert.strictEqual(track, null);

    const handle = await db.fileHandles.get('trk_test_1');
    assert.strictEqual(handle, undefined);

    const playlistItems = await db.playlistTracks.where('trackId').equals('trk_test_1').toArray();
    assert.strictEqual(playlistItems.length, 0);

    const queueItems = await db.activeQueue.where('trackId').equals('trk_test_1').toArray();
    assert.strictEqual(queueItems.length, 0);

    const historyItems = await db.playbackHistory.where('trackId').equals('trk_test_1').toArray();
    assert.strictEqual(historyItems.length, 0);
  });
});

test('Library Persistence: FileSourceResolver & Availability Management', async (t) => {
  await t.test('registerSessionFile, getSessionFile, and removeSessionFile operate on in-memory map', () => {
    const mockFile = { name: 'sample.mp3', size: 5000 };
    FileSourceResolver.registerSessionFile('trk_session_1', mockFile);

    assert.strictEqual(FileSourceResolver.getSessionFile('trk_session_1'), mockFile);

    FileSourceResolver.removeSessionFile('trk_session_1');
    assert.strictEqual(FileSourceResolver.getSessionFile('trk_session_1'), undefined);
  });

  await t.test('resolvePlayableSource succeeds when session file exists in memory', async () => {
    const mockFile = { name: 'active.mp3', size: 8000 };
    FileSourceResolver.registerSessionFile('trk_active', mockFile);

    const track = {
      trackId: 'trk_active',
      isAvailable: 1,
      source: createSourceDescriptor('web_session_file', 'trk_active', 'active.mp3', 8000),
    };

    const resolved = await FileSourceResolver.resolvePlayableSource(track);
    assert.ok(resolved);
    assert.strictEqual(resolved.fileInstance, mockFile);
  });

  await t.test('resolvePlayableSource fails and updates isAvailable=0 when session file expired after reload', async () => {
    await TrackRepository.clearAll();
    const track = {
      trackId: 'trk_expired',
      sourceFingerprint: '9000_123_expired.mp3',
      title: 'Expired Track',
      artist: 'Unknown',
      album: 'Local',
      duration: 120,
      isAvailable: 1,
      source: createSourceDescriptor('web_session_file', 'trk_expired', 'expired.mp3', 9000),
    };
    await TrackRepository.addTrack(track);

    // Pastikan session map TIDAK memiliki track ini (mensimulasikan reload browser)
    FileSourceResolver.removeSessionFile('trk_expired');

    await assert.rejects(
      async () => {
        await FileSourceResolver.resolvePlayableSource(track);
      },
      /Session expired/
    );

    // Verifikasi status ketersediaan diubah menjadi 0 di database
    const fetched = await TrackRepository.getTrackById('trk_expired');
    assert.strictEqual(fetched.isAvailable, 0);
  });
});

test('Library Persistence: LibraryManager Deduplication & Metadata Parsing', async (t) => {
  await t.test('parseMetadataFromFilename splits Artist - Title correctly', () => {
    const res1 = parseMetadataFromFilename('Pink Floyd - Comfortably Numb.mp3');
    assert.strictEqual(res1.artist, 'Pink Floyd');
    assert.strictEqual(res1.title, 'Comfortably Numb');

    const res2 = parseMetadataFromFilename('Stairway to Heaven.flac');
    assert.strictEqual(res2.artist, 'Unknown Artist');
    assert.strictEqual(res2.title, 'Stairway to Heaven');
  });

  await t.test('computeFingerprint creates consistent hash string', () => {
    const fp = computeFingerprint(2048, 1710000000, 'test.wav');
    assert.strictEqual(fp, '2048_1710000000_test.wav');
  });

  await t.test('importItems prevents duplicate records and restores availability', async () => {
    await TrackRepository.clearAll();

    const mockFileA = {
      name: 'Dire Straits - Sultans of Swing.mp3',
      size: 15400,
      lastModified: 1690000000,
    };

    // Import pertama kali
    const res1 = await LibraryManager.importItems([mockFileA]);
    assert.strictEqual(res1.imported.length, 1);
    assert.strictEqual(res1.skipped.length, 0);
    assert.strictEqual(res1.imported[0].artist, 'Dire Straits');
    assert.strictEqual(res1.imported[0].title, 'Sultans of Swing');

    // Import file yang sama lagi
    const res2 = await LibraryManager.importItems([mockFileA]);
    assert.strictEqual(res2.imported.length, 0);
    assert.strictEqual(res2.skipped.length, 1); // Terdeteksi duplikat dan di-skip

    // Verifikasi total track di library tetap 1
    const allTracks = await LibraryManager.getAllTracks();
    assert.strictEqual(allTracks.length, 1);
  });
});
