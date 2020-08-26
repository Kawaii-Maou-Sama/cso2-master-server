import { HashContainer } from 'hash'
import { sql } from 'db'
import { SetupSetParams } from 'utilitites'

export const USER_MAX_LEVEL = 99

export type SetUserBody = {
    gm: boolean

    points: number
    cash: number
    mpoints: number

    level: number
    curExp: number
    maxExp: number
    vipLevel: number
    vipXp: number

    rank: number

    rankFrame: number

    playedMatches: number
    wins: number
    secondsPlayed: number

    kills: number
    deaths: number
    assists: number
    headshots: number
    accuracy: number

    avatar: number

    unlockedAvatars: number[]

    netCafeName: string

    clanName: string
    clanMark: number

    worldRank: number

    titleId: number
    unlockedTitles: number[]
    signature: string

    bestGamemode: number
    bestMap: number
    unlockedAchievements: number[]

    skillHumanCurXp: number
    skillHumanMaxXp: number
    skillHumanPoints: number
    skillZombieCurXp: number
    skillZombieMaxXp: number
    skillZombiePoints: number
}

/**
 * represents an user and its data
 */
export class User {
    /**
     * retrieve every user in the db
     * @param colOffset the index where the collection should begin
     * @param colLength the collection's length
     * @returns a promise with the users
     */
    public static async getAll(
        colOffset: number,
        colLength: number
    ): Promise<User[]> {
        return await sql<
            User[]
        >`SELECT * FROM users LIMIT ${colLength} OFFSET ${colOffset};`
    }

    /**
     * retrieve an user's information by its ID
     * @param userId the target's user ID
     * @param sanitize should sensitive data be nulled out? defaults to true
     * @returns the target user, null if not
     */
    public static async getById(
        userId: number,
        sanitize = true
    ): Promise<User> {
        const resRows = await sql<
            User
        >`SELECT * FROM users WHERE id = ${userId};`

        if (resRows.count === 0) {
            return null
        } else if (resRows.count === 1) {
            return sanitize === true
                ? this.SanitizeForPublic(resRows[0])
                : resRows[0]
        } else {
            throw new Error('getUserById: got more than one row for an user')
        }
    }

    /**
     * retrieve an user's information by its username
     * @param userName the target's user name
     * @param sanitize should sensitive data be nulled out? defaults to true
     * @returns the target user if found, null if not
     */
    public static async getByName(
        userName: string,
        sanitize = true
    ): Promise<User> {
        const resRows = await sql<
            User
        >`SELECT * FROM users WHERE username = ${userName};`

        if (resRows.count === 0) {
            return null
        } else if (resRows.count === 1) {
            return sanitize === true
                ? this.SanitizeForPublic(resRows[0])
                : resRows[0]
        } else {
            throw new Error('getUserByName: got more than one row for an user')
        }
    }

    /**
     * is an user's name or ingame player name already taken?
     * @param userName the target's user name
     * @param playerName the target's ingame player name
     * @returns true if so, false if not
     */
    public static async isTaken(
        userName: string,
        playerName: string
    ): Promise<boolean> {
        const resRows = await sql<User>`
            SELECT * FROM users
            WHERE username = ${userName} OR playername = ${playerName};
        `
        return resRows.count !== 0
    }

    /**
     * set an user's information properties
     * @param userId the target user's ID
     * @param updatedUser the new user information properties
     * @returns true if updated sucessfully, false if the user does not exist
     */
    public static async set(
        userId: number,
        updatedUser: SetUserBody
    ): Promise<boolean> {
        if ((await User.getById(userId, false)) == null) {
            return false
        }

        await sql`
            UPDATE users
            SET ${sql(updatedUser, ...SetupSetParams(updatedUser))}
            WHERE id = ${userId};
        `
        return true
    }

    /**
     * create a new user in the db
     * @param userName the new user's name
     * @param playerName the new user's ingame player name
     * @param password the new user's password
     * @param securityQuestion the new user's security question index
     * @param securityAnswer the new user's security answer
     * @returns a promise with the new created user
     */
    public static async create(
        userName: string,
        playerName: string,
        password: string,
        securityQuestion: number,
        securityAnswer: string
    ): Promise<User> {
        const [passwordHash, secAnswerHash] = await Promise.all([
            HashContainer.create(password),
            HashContainer.create(securityAnswer)
        ])

        // clear out plain password
        password = null
        securityAnswer = null

        const res = await sql<User>`
            INSERT INTO users (username, playername, password_hash, security_question_index, security_answer_hash)
            VALUES (${userName}, ${playerName}, ${passwordHash.build()}, ${securityQuestion}, ${secAnswerHash.build()})
            RETURNING *;
        `

        if (res.count !== 1) {
            throw new Error('INSERT query did not return a single row')
        }

        // don't send the password hash over
        return this.SanitizeForPublic(res[0])
    }

    /**
     * delete an user by its ID
     * @param userId the target's user ID
     * @returns true if the user was deleted, false if the user was not fonud
     */
    public static async removeById(userId: number): Promise<boolean> {
        if ((await User.getById(userId, false)) == null) {
            return false
        }

        await sql`
            DELETE FROM users
            WHERE id = ${userId};
        `
        return true
    }

    /**
     * validate an user's credentials
     * @param userName the user's name
     * @param password the user's password
     * @return the user's ID, or null if failed
     */
    public static async validateCredentials(
        userName: string,
        password: string
    ): Promise<number> {
        const user: User = await User.getByName(userName, false)

        if (user == null) {
            return null
        }

        const targetHash: HashContainer = HashContainer.from(user.password_hash)
        const inputHash: HashContainer = await targetHash.cloneSettings(
            password
        )

        if (targetHash.compare(inputHash) === false) {
            return null
        }

        return user.id
    }

    /**
     * validate an user's security answer
     * @param userName the user's name
     * @param password the user's security answer
     * @return the user's ID, or null if failed
     */
    public static async validateSecurityAnswer(
        userName: string,
        securityAnswer: string
    ): Promise<number> {
        const user: User = await User.getByName(userName, false)

        if (user == null) {
            return null
        }

        const targetHash = HashContainer.from(user.security_answer_hash)
        const inputHash = await targetHash.cloneSettings(securityAnswer)

        if (targetHash.compare(inputHash) === false) {
            return null
        }

        return user.id
    }

    private static SanitizeForPublic(user: User): User {
        user.password_hash = null
        user.security_question_index = null
        user.security_answer_hash = null
        return user
    }

    public id: number
    public username: string
    public playername: string

    public password_hash: string
    public security_question_index: number
    public security_answer_hash: string

    public gm: boolean

    public points: number
    public cash: number
    public mpoints: number

    public level: number
    public cur_xp: BigInt
    public max_xp: BigInt
    public vip_level: number
    public vip_xp: number

    public rank: number

    public rank_frame: number

    public played_matches: number
    public wins: number
    public seconds_played: number

    public kills: number
    public deaths: number
    public assists: number
    public headshots: number
    public accuracy: number

    public avatar: number
    public unlocked_avatars: number[]

    public title: number
    public unlocked_titles: number[]
    public signature: string

    public unlocked_achievements: number[]

    public campaign_flags: number

    public netcafe_name: string

    public clan_name: string
    public clan_mark: number

    public world_rank: number

    public best_gamemode: number
    public best_map: number

    public skill_human_curxp: BigInt
    public skill_human_maxxp: BigInt
    public skill_human_points: BigInt
    public skill_zombie_curxp: BigInt
    public skill_zombie_maxxp: BigInt
    public skill_zombie_points: BigInt
}
