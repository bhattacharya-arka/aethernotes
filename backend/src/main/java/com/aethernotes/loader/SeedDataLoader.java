package com.aethernotes.loader;

import com.aethernotes.encryption.EncryptionService;
import com.aethernotes.entity.Note;
import com.aethernotes.entity.Tag;
import com.aethernotes.entity.User;
import com.aethernotes.repository.NoteRepository;
import com.aethernotes.repository.TagRepository;
import com.aethernotes.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.datafaker.Faker;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Seed data loader for AetherNotes.
 *
 * <p>Activated via {@code APP_SEED_DATA=true}.
 * Generates realistic users and notes using Java Faker.
 *
 * <p>Seeded credentials: email = generated, password = "Password123!"
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SeedDataLoader implements ApplicationRunner {

    private static final String SEED_PASSWORD    = "Password123!";
    private static final int    NOTES_PER_USER   = 20;
    private static final int    MAX_TAGS_PER_NOTE = 3;

    @Value("${app.seed-data:false}")
    private boolean seedEnabled;

    @Value("${app.seed-users:50}")
    private int seedUsers;

    private final UserRepository    userRepository;
    private final NoteRepository    noteRepository;
    private final TagRepository     tagRepository;
    private final PasswordEncoder   passwordEncoder;
    private final EncryptionService encryptionService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            log.info("Seed loader disabled. Set APP_SEED_DATA=true to enable.");
            return;
        }

        // Always ensure the demo account exists — idempotent, runs on every startup.
        // This guarantees a known-credential account regardless of DB state.
        ensureDemoAccount();

        long existingUsers = userRepository.count();
        if (existingUsers > 1) {
            // More than just the demo account → bulk seed already ran, skip.
            log.info("Database already seeded ({} users present). Skipping bulk seed.", existingUsers);
            return;
        }

        log.info("=== AetherNotes Seed Loader started — generating {} users ===", seedUsers);
        Faker faker = new Faker(Locale.ENGLISH);

        List<Tag> allTags = seedTags(faker);
        List<User> users  = seedUsers(faker, allTags);

        log.info("=== Seed complete: {} users, {} notes ===",
                users.size(), (long) users.size() * NOTES_PER_USER);
        log.info("Login with any seeded user using password: {}", SEED_PASSWORD);
    }

    /**
     * Creates a deterministic demo account so there is always a known email+password
     * available for testing. Safe to call on every startup (no-op if already present).
     */
    private void ensureDemoAccount() {
        if (userRepository.existsByEmail("demo@aethernotes.dev")) {
            log.debug("Demo account already exists — skipping creation.");
            return;
        }
        byte[] salt = encryptionService.generateSalt();
        User demo = User.builder()
                .username("demo")
                .email("demo@aethernotes.dev")
                .passwordHash(passwordEncoder.encode(SEED_PASSWORD))
                .encryptionSalt(Base64.getEncoder().encodeToString(salt))
                .build();
        userRepository.save(demo);
        log.info("========================================");
        log.info("  Demo account ready:");
        log.info("  Email   : demo@aethernotes.dev");
        log.info("  Password: {}", SEED_PASSWORD);
        log.info("========================================");
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Tags
    // ──────────────────────────────────────────────────────────────────────────

    private List<Tag> seedTags(Faker faker) {
        List<String> tagNames = List.of(
                "work", "personal", "ideas", "todo", "research",
                "journal", "meeting-notes", "project", "reference", "archive",
                "draft", "urgent", "review", "planning", "learning"
        );

        List<Tag> tags = tagNames.stream()
                .map(name -> tagRepository.findByName(name)
                        .orElseGet(() -> tagRepository.save(Tag.builder().name(name).build())))
                .collect(Collectors.toList());

        log.info("Seeded {} tags", tags.size());
        return tags;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Users
    // ──────────────────────────────────────────────────────────────────────────

    private List<User> seedUsers(Faker faker, List<Tag> allTags) {
        String hashedPassword = passwordEncoder.encode(SEED_PASSWORD);
        Set<String> usedEmails    = new HashSet<>();
        Set<String> usedUsernames = new HashSet<>();
        List<User>  seeded        = new ArrayList<>();

        int attempts = 0;
        while (seeded.size() < seedUsers && attempts < seedUsers * 3) {
            attempts++;
            try {
                String firstName = faker.name().firstName();
                String lastName  = faker.name().lastName();
                String username  = (firstName + "." + lastName).toLowerCase()
                        .replaceAll("[^a-z.]", "") + faker.number().numberBetween(1, 999);
                String email     = username + "@" + faker.internet().domainName();

                if (usedEmails.contains(email) || usedUsernames.contains(username)) continue;
                if (username.length() > 50) continue;

                byte[] salt = encryptionService.generateSalt();

                User user = User.builder()
                        .username(username)
                        .email(email)
                        .passwordHash(hashedPassword)
                        .encryptionSalt(Base64.getEncoder().encodeToString(salt))
                        .build();

                User savedUser = userRepository.save(user);
                seedNotes(faker, savedUser, salt, allTags);

                usedEmails.add(email);
                usedUsernames.add(username);
                seeded.add(savedUser);

                if (seeded.size() % 10 == 0) {
                    log.info("  Seeded {}/{} users...", seeded.size(), seedUsers);
                }
            } catch (Exception e) {
                log.debug("Seed user creation failed (collision?): {}", e.getMessage());
            }
        }

        return seeded;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Notes
    // ──────────────────────────────────────────────────────────────────────────

    private void seedNotes(Faker faker, User user, byte[] salt, List<Tag> allTags) {
        byte[] encKey = encryptionService.deriveKey(SEED_PASSWORD, salt);
        Random rng    = new Random();

        List<Note> notes = IntStream.range(0, NOTES_PER_USER)
                .mapToObj(i -> {
                    String title   = generateNoteTitle(faker);
                    String content = generateMarkdownContent(faker);

                    String[] encParts = encryptContent(content, encKey);

                    Set<Tag> tags = pickTags(allTags, rng);

                    return Note.builder()
                            .user(user)
                            .title(title)
                            .iv(encParts[0])
                            .encryptedContent(encParts[1])
                            .favorite(rng.nextInt(10) == 0)   // ~10% favorite
                            .tags(tags)
                            .build();
                })
                .collect(Collectors.toList());

        noteRepository.saveAll(notes);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Content generation
    // ──────────────────────────────────────────────────────────────────────────

    private String generateNoteTitle(Faker faker) {
        String[] templates = {
                faker.lorem().sentence(4),
                "Meeting: " + faker.company().name(),
                "Ideas for " + faker.lorem().word(),
                "TODO: " + faker.lorem().sentence(3),
                faker.book().title(),
                "Notes on " + faker.educator().course(),
                faker.lorem().sentence(),
        };
        return templates[new Random().nextInt(templates.length)];
    }

    private String generateMarkdownContent(Faker faker) {
        return """
                # %s

                %s

                ## Key Points

                - %s
                - %s
                - %s

                ## Notes

                %s

                %s

                ---
                *Last reviewed: %s*
                """.formatted(
                faker.lorem().sentence(5),
                faker.lorem().paragraph(3),
                faker.lorem().sentence(8),
                faker.lorem().sentence(6),
                faker.lorem().sentence(7),
                faker.lorem().paragraph(2),
                faker.lorem().paragraph(2),
                faker.date().birthday().toString()
        );
    }

    private String[] encryptContent(String content, byte[] key) {
        try {
            String encoded = encryptionService.encryptNote(content, key);
            return encoded.split(":", 2);
        } catch (Exception e) {
            log.error("Failed to encrypt seed note content: {}", e.getMessage());
            return new String[]{"", ""};
        }
    }

    private Set<Tag> pickTags(List<Tag> allTags, Random rng) {
        int count = rng.nextInt(MAX_TAGS_PER_NOTE + 1);
        Set<Tag> picked = new HashSet<>();
        for (int i = 0; i < count && i < allTags.size(); i++) {
            picked.add(allTags.get(rng.nextInt(allTags.size())));
        }
        return picked;
    }
}
